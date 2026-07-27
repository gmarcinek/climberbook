import { NextResponse } from "next/server";
import {
  EmailPasswordRegistrationError,
  registerEmailPasswordUser,
} from "@/lib/server/climberbook-repository";

export const runtime = "nodejs";

function getText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const input: unknown = await request.json();
  const values =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const email = getText(values.email).toLowerCase();
  const password = getText(values.password);
  const displayName = getText(values.displayName) || email.split("@")[0];

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json(
      { error: "Podaj poprawny adres e-mail." },
      { status: 400 },
    );
  }
  if (password.length < 12) {
    return NextResponse.json(
      { error: "Hasło musi mieć co najmniej 12 znaków." },
      { status: 400 },
    );
  }

  try {
    const user = await registerEmailPasswordUser({
      email,
      password,
      displayName,
    });
    return NextResponse.json(
      { user: { id: user.id, email: user.email } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof EmailPasswordRegistrationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("Nie udało się utworzyć konta e-mail.", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
      { status: 500 },
    );
  }
}