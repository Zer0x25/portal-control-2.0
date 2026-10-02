// inspect-records.ts
import prisma from "./src/services/db";

async function main() {
  try {
    // Fetch the most recent records
    const records = await prisma.timeRecord.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    console.log("--- Latest Records Raw Data ---");
    for (const r of records) {
      console.log(`ID: ${r.id}`);
      console.log(`Employee: ${r.employeeName}`);
      console.log(`Date: ${r.date}`);
      console.log(`Status: ${r.status}`);
      console.log(`Inicio Colacion: '${r.inicioColacion}'`);
      console.log(`Fin Colacion:    '${r.finColacion}'`);

      // Test parsing
      if (r.finColacion) {
        const d = new Date(r.finColacion);
        console.log(`Parsed FinColacion: ${d.toString()} | Timestamp: ${d.getTime()}`);
      } else {
        console.log(`Parsed FinColacion: NULL`);
      }
      console.log("-------------------------------");
    }
  } catch (e) {
    console.error(e);
  }
}

main();
