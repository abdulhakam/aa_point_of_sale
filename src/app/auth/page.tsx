"use client";
import { useForm } from "@mantine/form";
import { TextInput, PasswordInput, Text, Paper, Group, Button, Stack, Alert } from "@mantine/core";
import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import pb from "../pocketbase";
export default function AuthenticationForm(props) {
  const router = useRouter();
  const params = useSearchParams();
  const auth = useMutation({
    mutationFn: (dt: { email: string; password: string }) =>
      pb.collection("users").authWithPassword(dt.email, dt.password),
    onSuccess: () => {
      params.get("redirection") ? router.push(params.get("redirection")) : router.push("/app/dashboard");
    },
  });
  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      password: (val) => (val.length < 5 ? "Password should include at least 5 characters" : null),
    },
  });

  useEffect(() => {
    if (pb.authStore.isValid) {
      params.get("redirection") ? router.push(params.get("redirection")) : router.push("/app/dashboard");
    }
  }, []);

  const submitFunction = (data) => {
    auth.mutate({ email: data.email, password: data.password });
  };
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper w={"28rem"} radius='md' p='xl' withBorder>
        <Text size='lg' fw={500}>
          Welcome to POS
        </Text>
        <form onSubmit={form.onSubmit(submitFunction)}>
          {auth.isError && <Alert color='red'>{auth.error.message}</Alert>}
          <Stack>
            <TextInput
              required
              label='username or Email'
              placeholder='your@email.com'
              value={form.values.email}
              onChange={(event) => form.setFieldValue("email", event.currentTarget.value)}
              error={form.errors.email && "Invalid email"}
              radius='md'
            />
            <PasswordInput
              required
              label='Password'
              placeholder='Your password'
              value={form.values.password}
              onChange={(event) => form.setFieldValue("password", event.currentTarget.value)}
              error={form.errors.password && "Password should include at least 10 characters"}
              radius='md'
            />
          </Stack>
          <Group justify='space-between' mt='xl'>
            <Button disabled={!auth.isIdle} type='submit' radius='xl'>
              Login
            </Button>
          </Group>
        </form>
      </Paper>
    </div>
  );
}
