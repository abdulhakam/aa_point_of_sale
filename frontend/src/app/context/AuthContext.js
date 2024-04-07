'use Client'
import pb from "../pocketbase";
import React from "react";

import { createContext, useContext } from "react";
const userAuthContext = createContext();

export function UserAuthContextProvider({ children }) {
  async function login({ email, password }) {
    return await pb.collection("users").authWithPassword(email, password);
  }
  function logout() {
    pb.authStore.clear();
  }

  return <userAuthContext.Provider value={{login,logout}}>{children}</userAuthContext.Provider>;
}

export function useUserAuthContext() {
  return useContext(userAuthContext);
}
