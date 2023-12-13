'use Client'
import pb from "../pocketbase";
import React from "react";

import { createContext, useContext } from "react";
import { useRouter } from "next/navigation";
const userAuthContext = createContext();

export function UserAuthContextProvider({ children }) {
  const router = useRouter()
  async function login({ email, password }) {
    return await pb.collection("users").authWithPassword(email, password);
  }
  function logout() {
    pb.authStore.clear();
    router.push('/auth')
  }

  return <userAuthContext.Provider value={{login,logout}}>{children}</userAuthContext.Provider>;
}

export function useUserAuthContext() {
  return useContext(userAuthContext);
}
