import DatabaseItem from "./DatabaseItem";
import TaskUI from "./TaskUI";
import UserConfigStore from "./UserConfigStore";
import UserConfigStoreDatabase from "./UserConfigStoreDatabase";

export default class {
  readonly db: DatabaseItem;
  readonly ui: TaskUI;
  readonly body: any;
  readonly callbackUri: string;
  readonly userConfigStore: UserConfigStore;

  constructor(
    db: DatabaseItem,
    ui: TaskUI,
    body: any,
    callbackUri: string,
    userConfigStore?: UserConfigStore
  ) {
    this.db = db;
    this.ui = ui;
    this.body = body;
    this.callbackUri = callbackUri;
    if (userConfigStore) this.userConfigStore = userConfigStore;
    else this.userConfigStore = new UserConfigStoreDatabase(db);
  }
}
