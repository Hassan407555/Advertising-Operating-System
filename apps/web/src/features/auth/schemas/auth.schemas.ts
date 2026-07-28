import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password must be at most 100 characters.")
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
  });

export const loginSchema = z.object({
  email: z.email("Invalid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be at most 100 characters."),
});

export const registerSchema = z.object({
  organizationName: z.string().min(2).max(100),
  email: z.email("Invalid email address."),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  password: passwordSchema,
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type RegisterSchema = z.infer<typeof registerSchema>;
