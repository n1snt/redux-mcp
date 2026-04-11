import { reduxRuntimeController } from "../redux/runtime";
import type { RuntimeController } from "../redux/runtime-controller.types";

let activeRuntimeController: RuntimeController = reduxRuntimeController;

export const getRuntimeController = (): RuntimeController => activeRuntimeController;

export const setRuntimeController = (controller: RuntimeController): void => {
  activeRuntimeController = controller;
};

export const resetRuntimeController = (): void => {
  activeRuntimeController = reduxRuntimeController;
};
