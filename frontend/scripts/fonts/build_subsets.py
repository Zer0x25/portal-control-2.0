"""Generate and verify local Latin webfonts; originals remain Unicode fallbacks."""

import argparse
import hashlib
import io
import json
import subprocess
from pathlib import Path

import brotli
import fontTools
from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/assets/fonts"
SOURCES = {
    "Inter-Regular": "30b2259ef43df8f66adb853faf6c61e4bb8b8083a2d3bc77de4d229c8a5e8325",
    "Inter-SemiBold": "cdaafcd49f7e4e746fbf0925fd24be39e132d359167c4d2126134d3d9e077b59",
    "Inter-Bold": "17df9edfac15895e3a457cc4aca5768d550631daf6023a42b2301b34dfa84c35",
    "RobotoMono-Regular": "58f56690e10a6181575c981ca1c565fd14aa23d307d0d126148f21f1ea5d931c",
    "RobotoMono-Bold": "e5f445bb5ab601f16339e2a9f71063a67f674c6867140deab184d75d177fa0f1",
}
# Latin/Spanish, combining accents, punctuation, currencies and common symbols.
# Every other codepoint remains available from the original on demand.
LATIN = set(range(0x100)) | set(range(0x300, 0x370))
LATIN |= set(range(0x2000, 0x2070)) | set(range(0x20A0, 0x20D0))
LATIN |= {0x131, 0x152, 0x153, 0x2BB, 0x2BC, 0x2C6, 0x2DA, 0x2DC,
          0x2074, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212,
          0x2215, 0x2713, 0x2714, 0xFEFF, 0xFFFD}
FACES = [("Inter", weight, file) for weight, file in [
    (400, "Inter-Regular"), (500, "Inter-Regular"),
    (600, "Inter-SemiBold"), (700, "Inter-SemiBold"),
    (800, "Inter-Bold"), (900, "Inter-Bold"),
]] + [("Roboto Mono", 400, "RobotoMono-Regular"), ("Roboto Mono", 700, "RobotoMono-Bold")]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def unicode_ranges(points):
    ranges = []
    for point in sorted(points):
        if ranges and point == ranges[-1][1] + 1:
            ranges[-1][1] = point
        else:
            ranges.append([point, point])
    return ", ".join(f"U+{lo:04X}" if lo == hi else f"U+{lo:04X}-{hi:04X}"
                     for lo, hi in ranges)


def verify_glyphs(original, derived):
    source_map, target_map = original.getBestCmap(), derived.getBestCmap()
    assert set(target_map) == set(source_map) & LATIN, "Subset cmap changed"
    source_glyphs, target_glyphs = original.getGlyphSet(), derived.getGlyphSet()
    for codepoint, target_name in target_map.items():
        source_glyph, target_glyph = source_glyphs[source_map[codepoint]], target_glyphs[target_name]
        assert source_glyph.width == target_glyph.width, f"Width changed: U+{codepoint:04X}"
        source_pen, target_pen = DecomposingRecordingPen(source_glyphs), DecomposingRecordingPen(target_glyphs)
        source_glyph.draw(source_pen)
        target_glyph.draw(target_pen)
        assert source_pen.value == target_pen.value, f"Outline changed: U+{codepoint:04X}"
    for table, fields in [("hhea", ["ascent", "descent", "lineGap"]),
                          ("OS/2", ["sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent"])]:
        for field in fields:
            assert getattr(original[table], field) == getattr(derived[table], field), f"Metric changed: {field}"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    assert fontTools.__version__ == "4.67.0" and brotli.__version__ == "1.2.1", "Install pinned requirements.txt"
    outputs, records = {}, []
    for stem, expected_hash in SOURCES.items():
        original_path = ASSETS / f"{stem}.woff2"
        original_bytes = original_path.read_bytes()
        assert sha(original_bytes) == expected_hash, f"Original source changed: {stem}"
        original = TTFont(io.BytesIO(original_bytes), recalcTimestamp=False)
        font = TTFont(io.BytesIO(original_bytes), recalcTimestamp=False)
        license_name = "Inter" if stem.startswith("Inter-") else "RobotoMono"
        license_text = (ROOT / f"public/fonts/LICENSE-{license_name}.txt").read_text()
        font["name"].setName(license_text, 13, 3, 1, 0x409)
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        options.harfbuzz_repacker = False
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=LATIN)
        subsetter.subset(font)
        buffer = io.BytesIO()
        font.save(buffer)
        data = buffer.getvalue()
        verify_glyphs(original, TTFont(io.BytesIO(data)))
        output_name = f"{stem}-latin.woff2"
        outputs[ASSETS / output_name] = data
        records.append({"source": original_path.name, "sourceSha256": expected_hash,
                        "sourceBytes": len(original_bytes), "subset": output_name,
                        "subsetSha256": sha(data), "subsetBytes": len(data),
                        "sourceCharacters": len(original.getBestCmap()),
                        "subsetCharacters": len(font.getBestCmap())})

    complement = set(range(0x110000)) - LATIN
    css = "/* Generated by scripts/fonts/build_subsets.py. Do not edit. */\n@layer base {\n"
    for family, weight, stem in FACES:
        for suffix, points in [("", complement), ("-latin", LATIN)]:
            css += f'''  @font-face {{
    font-family: "{family}";
    font-style: normal;
    font-weight: {weight};
    font-display: swap;
    src: url("./{stem}{suffix}.woff2") format("woff2");
    unicode-range: {unicode_ranges(points)};
  }}
'''
    css += "}\n"
    formatted = subprocess.run([str(ROOT / "node_modules/.bin/prettier"), "--stdin-filepath", str(ASSETS / "fonts.css")],
                               input=css, text=True, capture_output=True, check=True).stdout.encode()
    outputs[ASSETS / "fonts.css"] = formatted
    manifest = {"schemaVersion": 1, "fontTools": fontTools.__version__, "brotli": brotli.__version__,
                "generatorSha256": sha(Path(__file__).read_bytes()), "cssSha256": sha(formatted),
                "latinUnicodeRange": unicode_ranges(LATIN), "fonts": records}
    outputs[ASSETS / "font-subsets.json"] = (json.dumps(manifest, indent=2) + "\n").encode()
    for file, content in outputs.items():
        if args.check:
            assert file.exists() and file.read_bytes() == content, f"Regenerate {file.relative_to(ROOT)}"
        else:
            file.write_bytes(content)
    print(json.dumps({"mode": "check" if args.check else "generate", "fonts": records}, indent=2))


if __name__ == "__main__":
    main()
