import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";

import {
  normalizeFormValues,
  toErrorMessage,
  useAppForm,
  withSubmitGuard,
} from "../../hooks/useAppForm";
import Input from "../../components/ui/Input";

/**
 * Spec 036 T2 (AC1, AC3, AC4): contrato de la capa de formulario.
 *
 * Cubre lo que la capa decide y que antes cada formulario decidía por su
 * cuenta: **cuándo se ve el error**, **cómo se bloquea el doble envío**,
 * **cómo se normaliza el payload** y **a dónde va el foco** tras un envío
 * fallido.
 */

interface Values {
  name: string;
  email: string;
  notes?: string | null;
}

const schema = z.object({
  name: z
    .string({ error: "El nombre es obligatorio." })
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres."),
  email: z.string({ error: "El email es obligatorio." }).trim().email("Formato de email inválido."),
  notes: z.string().nullish(),
});

const DEFAULT_VALUES: Values = { name: "", email: "", notes: "" };

interface HarnessProps {
  onSubmit: (values: Values) => void | Promise<void>;
  defaultValues?: Values;
  nullableFields?: string[];
}

const Harness = ({ onSubmit, defaultValues, nullableFields }: HarnessProps) => {
  const form = useAppForm<Values>({
    schema,
    defaultValues: defaultValues ?? DEFAULT_VALUES,
    onSubmit,
    nullableFields,
  });

  return (
    <form {...form.formProps}>
      <Input
        id="name"
        label="NOMBRE"
        value={form.values.name}
        onChange={(event) => form.setValue("name", event.target.value)}
        error={form.getError("name")}
      />
      <Input
        id="email"
        label="EMAIL"
        value={form.values.email}
        onChange={(event) => form.setValue("email", event.target.value)}
        error={form.getError("email")}
      />
      <Input
        id="notes"
        label="NOTAS"
        value={form.values.notes ?? ""}
        onChange={(event) => form.setValue("notes", event.target.value)}
      />
      <button type="submit">ENVIAR</button>
    </form>
  );
};

describe("useAppForm (spec 036 AC1, AC3, AC4)", () => {
  it("no muestra errores antes del primer intento de envío", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("EMAIL"), "no-es-un-email");

    expect(screen.queryByText("Formato de email inválido.")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("expone el error por campo tras un envío fallido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("EMAIL"), "no-es-un-email");
    await user.click(screen.getByRole("button", { name: "ENVIAR" }));

    expect(await screen.findByText("Formato de email inválido.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("revalida en vivo después del primer intento (onChange)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    const email = screen.getByLabelText("EMAIL");
    await user.type(email, "no-es-un-email");
    await user.click(screen.getByRole("button", { name: "ENVIAR" }));
    expect(await screen.findByText("Formato de email inválido.")).toBeInTheDocument();

    await user.clear(email);
    await user.type(email, "persona@dominio.com");

    await waitFor(() =>
      expect(screen.queryByText("Formato de email inválido.")).not.toBeInTheDocument(),
    );
  });

  it("mueve el foco al primer control inválido tras un envío fallido", async () => {
    const user = userEvent.setup();
    render(<Harness onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "ENVIAR" }));

    await waitFor(() => expect(screen.getByLabelText("NOMBRE")).toHaveFocus());
  });

  it("bloquea el doble envío con un ref sincrónico", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 50)));
    render(<Harness onSubmit={onSubmit} />);

    const button = screen.getByRole("button", { name: "ENVIAR" });
    await user.type(screen.getByLabelText("NOMBRE"), "Juan Pérez");
    await user.type(screen.getByLabelText("EMAIL"), "persona@dominio.com");

    await user.click(button);
    await user.click(button);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("normaliza el payload (trim y '' -> null en opcionales)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} nullableFields={["notes"]} />);

    await user.type(screen.getByLabelText("NOMBRE"), "  Juan Pérez  ");
    await user.type(screen.getByLabelText("EMAIL"), "  persona@dominio.com  ");
    await user.click(screen.getByRole("button", { name: "ENVIAR" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "Juan Pérez",
      email: "persona@dominio.com",
      notes: null,
    });
  });
});

describe("withSubmitGuard (spec 036 AC4)", () => {
  it("ejecuta la tarea una sola vez mientras hay un intento en vuelo", async () => {
    const guard = { current: false };
    const task = vi.fn(() => Promise.resolve("ok"));

    const first = withSubmitGuard(guard, task);
    const second = await withSubmitGuard(guard, task);

    expect(second).toBeUndefined();
    expect(task).toHaveBeenCalledTimes(1);

    await expect(first).resolves.toBe("ok");
    expect(guard.current).toBe(false);
  });

  it("libera el guard aunque la tarea falle", async () => {
    const guard = { current: false };

    await expect(
      withSubmitGuard(guard, () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(guard.current).toBe(false);
  });
});

describe("normalizeFormValues (spec 036 T2)", () => {
  it("hace trim de las cadenas y convierte '' en null en los campos nullable", () => {
    const result = normalizeFormValues({ name: "  Juan  ", email: "", notes: undefined }, [
      "email",
    ]);

    expect(result).toEqual({ name: "Juan", email: null, notes: undefined });
  });

  it("omite la cadena vacia cuando el campo no es nullable", () => {
    const result = normalizeFormValues({ name: "", email: "" });

    expect(result).toEqual({ name: undefined, email: undefined });
  });

  it("la cadena vacia se omite del payload (JSON.stringify no la escribe)", () => {
    const payload = normalizeFormValues({ name: "", email: "" });

    expect(JSON.stringify(payload)).toBe("{}");
  });
});

describe("toErrorMessage (spec 036 T2)", () => {
  it("extrae el mensaje de las tres formas que devuelve TanStack Form", () => {
    expect(toErrorMessage("texto")).toBe("texto");
    expect(toErrorMessage({ message: "objeto" })).toBe("objeto");
    expect(toErrorMessage([{ message: "array" }])).toBe("array");
    expect(toErrorMessage(undefined)).toBeUndefined();
    expect(toErrorMessage(null)).toBeUndefined();
  });
});
