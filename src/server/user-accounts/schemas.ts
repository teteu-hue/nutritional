import { z } from "zod";

export const ACTIVITY_LEVELS = [
  "sedentario",
  "leve",
  "moderado",
  "ativo",
  "muito_ativo",
] as const;

export const GOALS = ["perder_peso", "manter_peso", "ganhar_peso"] as const;

export const BIOLOGICAL_SEXES = ["male", "female"] as const;

export const signupSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os termos de uso",
  }),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  biological_sex: z.enum(BIOLOGICAL_SEXES),
  height_cm: z.coerce.number().positive("Altura deve ser positiva"),
  weight_kg: z.coerce.number().min(20, "Peso mínimo: 20 kg").max(400, "Peso máximo: 400 kg"),
  body_fat_percent: z
    .union([z.coerce.number().min(3).max(75), z.null()])
    .optional(),
  activity_level: z.enum(ACTIVITY_LEVELS),
  goal: z.enum(GOALS),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function isProfileComplete(input: ProfileInput): boolean {
  return profileSchema.safeParse(input).success;
}
