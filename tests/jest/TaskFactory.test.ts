import { createTask, listTaskConfigs } from "../../src/TaskFactory";
import { NotFoundError } from "../../src/Errors";
import TaskParameters from "../../src/TaskParameters";
import Test from "../../src/tasks/Test";

test("createTask", async () => {
  expect(
    createTask({
      db: { type: Test.ID },
    } as TaskParameters)
  ).toBeInstanceOf(Test);

  expect(() => {
    createTask({
      db: { type: "" },
    } as TaskParameters);
  }).toThrowError(NotFoundError);
});

test("listTaskConfigs", async () => {
  expect(listTaskConfigs().find((item) => item.id === Test.ID)).toBeUndefined();
});
