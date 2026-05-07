import { Link } from "@tanstack/react-router";
import { Card, Group, Text } from "@mantine/core";

export function ShortcutsGrid({ modules }: { modules: any[] }) {
  return (
    <div className='p-2'>
      <Group>
        {modules.map((module) => (
          <Link to={`/app/${module.key}`} key={module.name}>
            <Card shadow='sm' padding='lg' radius='md' withBorder>
              <Card.Section withBorder inheritPadding py='xs'>
                <module.icon size={48} />
              </Card.Section>
              <Text fw={500} size='lg' mt='md'>
                {module.name}
              </Text>
            </Card>
          </Link>
        ))}
      </Group>
    </div>
  );
}
