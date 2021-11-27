import Bawag from "./tasks/Bawag";
import Easybank from "./tasks/Easybank";
import ErsteBerlin from "./tasks/ErsteBerlin";
import ErsteConnect from "./tasks/ErsteConnect";
import ErsteGeorge from "./tasks/ErsteGeorge";
import Foodsoft from "./tasks/Foodsoft";
import Holvi from "./tasks/Holvi";
import MeinElba from "./tasks/MeinElba";
import { NotFoundError } from "./Errors";
import Oberbank from "./tasks/Oberbank";
import Sparda from "./tasks/Sparda";
import TaskBase from "./TaskBase";
import TaskParameters from "./TaskParameters";
import Test from "./tasks/Test";

const LISTED_TASKS = [
  Bawag,
  Easybank,
  ErsteGeorge,
  ErsteConnect,
  ErsteBerlin,
  Foodsoft,
  Holvi,
  MeinElba,
  Oberbank,
  Sparda,
];

const ALL_TASKS = [...LISTED_TASKS, Test];

function findTaskType(name: string) {
  return ALL_TASKS.find((item) => item.ID === name);
}

export function createTask(params: TaskParameters): TaskBase {
  const type = params.db.type;
  const Type = findTaskType(type) as any;
  if (!Type) throw new NotFoundError(`TaskType "${type}" not found`);
  return new Type(params);
}

export function listTaskConfigs() {
  return LISTED_TASKS.map((task) => {
    return { id: task.ID, configs: task.CONFIGS.sort() };
  });
}
