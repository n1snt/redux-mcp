import * as z from "zod";

import type {
  AddTodoPayload,
  DecrementPayload,
  IncrementPayload,
  SetCounterPayload,
  ToggleTodoPayload,
} from "./types";

export const incrementPayloadSchema = z.object({
  amount: z.number().int().positive(),
});

export const decrementPayloadSchema = z.object({
  amount: z.number().int().positive(),
});

export const setCounterPayloadSchema = z.object({
  value: z.number().int(),
});

export const addTodoPayloadSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const toggleTodoPayloadSchema = z.object({
  id: z.string().min(1),
});

export type IncrementPayloadInput = z.infer<typeof incrementPayloadSchema> &
  IncrementPayload;
export type DecrementPayloadInput = z.infer<typeof decrementPayloadSchema> &
  DecrementPayload;
export type SetCounterPayloadInput = z.infer<typeof setCounterPayloadSchema> &
  SetCounterPayload;
export type AddTodoPayloadInput = z.infer<typeof addTodoPayloadSchema> &
  AddTodoPayload;
export type ToggleTodoPayloadInput = z.infer<typeof toggleTodoPayloadSchema> &
  ToggleTodoPayload;
