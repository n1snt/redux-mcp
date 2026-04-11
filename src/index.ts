import { startReduxRuntimeServers } from "./integration/runtime";

export { registerStoresForMCP } from "./integration/register";
export { startReduxRuntimeServers } from "./integration/runtime";
export type {
  RegisterStoresForMCPOptions,
  ReduxRuntimeHandle,
  RuntimeStartOptions,
  StoreRegistration,
} from "./integration/types";

void startReduxRuntimeServers({});
