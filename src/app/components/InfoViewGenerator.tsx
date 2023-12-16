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
        opened={opened} // You may want to manage this state depending on when to open the modal
        onClose={close} // You can customize the onClose behavior
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
          <FormGenerator formStructure={props.formStructure} data={props.data}/>
        </Container>
      </Modal>
      <Table.Td onClick={props.clickable ? open : null}>{props.children}</Table.Td>
    </>
  );
};

const InfoEditor = (props) => {
  const [opened, { open, close }] = useDisclosure(false);
  const [editedData, setEditedData] = useState({ ...props.data });

  const submitHandler = (e) => {};
  return (
    <>
      <Modal title='Edit Details' size={"lg"} centered opened={opened} onClose={close}>
        <Container size='md'>
          <form onSubmit={submitHandler}>
            {Object.keys(props.tableStructure).map((key) => (
              <Grid key={key}>
                <Grid.Col span={12}>
                  <Input.Wrapper label={props.tableStructure[key]}>
                    <Input
                      value={
                        editedData.expand && editedData.expand[key]
                          ? editedData.expand[key].name || editedData.expand[key].value || ""
                          : editedData[key] || ""
                      }
                      onChange={(event) => {
                        setEditedData((prevData) => ({
                          ...prevData,
                          [key]: event.currentTarget.value,
                        }));
                      }}
                    />
                  </Input.Wrapper>
                </Grid.Col>
              </Grid>
            ))}
            <Button mt={"md"} type='submit'>Submit</Button>
          </form>
        </Container>
      </Modal>
      <Button mt={"md"} onClick={open}>Edit</Button>
    </>
  );
};

export default InfoViewGenerator;
