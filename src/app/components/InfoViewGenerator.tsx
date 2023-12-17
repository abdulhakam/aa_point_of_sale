import React, { useState } from "react";
import { Modal, Button, Container, Grid, Input, Table, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { FormGenerator } from "./FormGenerator";

const InfoViewGenerator = (props) => {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Modal
        title='Details'
        size={"md"}
        centered
        opened={opened} 
        onClose={close} 
      >
        <Container>
          {Object.keys(props.tableStructure).map((key) => (
            <Grid justify='center' align='center' key={key}>
              <Grid.Col span={4}>
                <Text>{props.tableStructure[key]}:</Text>
              </Grid.Col>
              <Grid.Col span={8}>
                {props.data.expand && props.data.expand[key]
                  ? props.data.expand[key].name || props.data.expand[key].value || "--------"
                  : props.data[key] || "--------"}
              </Grid.Col>
            </Grid>
          ))}
          <FormGenerator formStructure={props.formStructure} allData={props.allData} data={props.data}/>
        </Container>
      </Modal>
      <Table.Td onClick={props.clickable ? open : null}>{props.children}</Table.Td>
    </>
  );
};
