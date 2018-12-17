import { CSUser } from "../../shared/api.protocol";
import { action } from "../common";
import { UsersActionsType } from "./types";

export const bootstrapUsers = (users: CSUser[]) => action(UsersActionsType.Bootstrap, users);

export const updateUser = (user: CSUser) => action(UsersActionsType.Update, user);

export const addUser = (user: CSUser) => action(UsersActionsType.Add, user);

export const addUsers = (users: CSUser[]) => action(UsersActionsType.AddMultiple, users);
