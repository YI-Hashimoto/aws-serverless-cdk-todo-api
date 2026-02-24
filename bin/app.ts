import { App } from "aws-cdk-lib";
import { TodoApiStack } from "../lib/todo-api-stack";

const app = new App();
new TodoApiStack(app, "TodoApiStack");
