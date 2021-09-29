export default interface UserConfigStore {
  set(value: string): Promise<void>;
  get(): Promise<string>;
}
