import { resetRuntimeController, setRuntimeController } from "./registry";
import { startReduxRuntimeServers, stopReduxRuntimeServers } from "./runtime";
import { RegisteredStoresController } from "./stores-controller";
import type { RegisterStoresForMCPOptions, ReduxRuntimeHandle } from "./types";

export const registerStoresForMCP = (options: RegisterStoresForMCPOptions): ReduxRuntimeHandle => {
  stopReduxRuntimeServers();
  if (options.stores.length === 0) {
    resetRuntimeController();
  } else {
    setRuntimeController(new RegisteredStoresController(options.stores));
  }

  return startReduxRuntimeServers(options.runtime);
};
