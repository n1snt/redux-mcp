import { UnsupportedActionError } from "../redux/controller";
import type { ActionDefinition, ActionHistoryEntry, DispatchRequest } from "../redux/types";
import type { StoreRegistration, StoreRuntimeController } from "./types";

interface ResolvedAction {
  storeName: string;
  actionName: string;
}

export class RegisteredStoresController implements StoreRuntimeController {
  private readonly storesByName: Map<string, StoreRegistration>;

  private readonly orderedStoreNames: string[];

  private readonly actionDefinitions: ActionDefinition[];

  private history: ActionHistoryEntry[] = [];

  public constructor(stores: StoreRegistration[]) {
    this.storesByName = new Map<string, StoreRegistration>();
    this.orderedStoreNames = stores.map((store: StoreRegistration) => store.storeName);
    this.actionDefinitions = [];

    stores.forEach((store: StoreRegistration): void => {
      this.storesByName.set(store.storeName, store);
    });
  }

  public getState(): unknown {
    if (this.orderedStoreNames.length === 1) {
      const onlyStoreName: string = this.orderedStoreNames[0] as string;
      return this.storesByName.get(onlyStoreName)?.store.getState();
    }

    return this.orderedStoreNames.reduce<Record<string, unknown>>((result, storeName): Record<string, unknown> => {
      result[storeName] = this.storesByName.get(storeName)?.store.getState();
      return result;
    }, {});
  }

  public getAvailableActions(): ActionDefinition[] {
    return this.actionDefinitions;
  }

  public getDispatchedActions(): ActionHistoryEntry[] {
    return this.history;
  }

  public resetState(): unknown {
    this.history = [];
    return this.getState();
  }

  public dispatchAction(request: DispatchRequest): unknown {
    const resolvedAction: ResolvedAction = this.resolveAction(request);
    const storeRegistration: StoreRegistration | undefined = this.storesByName.get(resolvedAction.storeName);

    if (!storeRegistration) {
      throw new UnsupportedActionError(request.type);
    }

    storeRegistration.store.dispatch({
      type: resolvedAction.actionName,
      payload: request.payload,
    });

    this.history.push({
      type: request.type,
      payload: request.payload,
    });
    this.recordActionDefinition(request.type, resolvedAction.storeName);
    return this.getState();
  }

  private recordActionDefinition(actionType: string, storeName: string): void {
    const alreadyKnown: boolean = this.actionDefinitions.some(
      (definition: ActionDefinition): boolean => definition.type === actionType,
    );
    if (alreadyKnown) {
      return;
    }

    this.actionDefinitions.push({
      type: actionType,
      description: `Observed action for ${storeName} store.`,
      payloadSchema: "unknown",
    });
  }

  private resolveAction(request: DispatchRequest): ResolvedAction {
    if (request.storeName) {
      return {
        storeName: request.storeName,
        actionName: request.type,
      };
    }

    const [prefixedStoreName, ...remainingParts] = request.type.split("/");
    if (prefixedStoreName && remainingParts.length > 0 && this.storesByName.has(prefixedStoreName)) {
      return {
        storeName: prefixedStoreName,
        actionName: remainingParts.join("/"),
      };
    }

    const defaultStoreName: string | undefined = this.orderedStoreNames[0];
    if (!defaultStoreName) {
      throw new UnsupportedActionError(request.type);
    }

    return {
      storeName: defaultStoreName,
      actionName: request.type,
    };
  }
}
