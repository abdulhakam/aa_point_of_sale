"use client";
import { useForm } from "@mantine/form";
import { TextInput, PasswordInput, Text, Paper, Group, Button, Stack, Alert } from "@mantine/core";
import { useUserAuthContext } from "../context/AuthContext";
import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
export default function AuthenticationForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUserAuthContext();
  const router = useRouter()
  const {
    mutate: loginPB,
    error,
    isError,
  } = useMutation({
    mutationFn: login,
    onMutate: () => setIsLoading(true),
    onSuccess: () => {router.push('/app/dashboard')},
    onSettled: () => setIsLoading(false),
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
  const submitFunction=(data: any)=> {
    loginPB({ email: data.email, password: data.password });
  }
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center" }}>
      <Paper w={"28rem"} radius='md' p='xl' withBorder>
        <Text size='lg' fw={500}>
          Welcome to POS
        </Text>
        <form onSubmit={form.onSubmit(submitFunction)}>
          {isError && <Alert color='red'>{error.message}</Alert>}
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
            {!isLoading ? (
              <Button type='submit' radius='xl'>
                Login
              </Button>
            ) : (
              <Button type='submit' radius='xl' disabled>
                Login
              </Button>
            )}
          </Group>
        </form>
      </Paper>
    </div>
  );
}
