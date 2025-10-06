import { NextRequest } from "next/server";
import { createUser } from "@/lib/appwrite/auth";
import { isValidEmail, validatePassword } from "@/lib/utils/helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    // Validate input
    if (!email || !password || !name) {
      return Response.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return Response.json(
        {
          error: "Password validation failed",
          details: passwordValidation.errors,
        },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return Response.json(
        { error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Create user
    const result = await createUser(email.trim(), password, name.trim());

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json(
      {
        success: true,
        message: "User created successfully",
        user: result.user
          ? {
              id: result.user.$id,
              email: result.user.email,
              name: result.user.name,
            }
          : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in register API:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
