import React from 'react';
import { Box, Header, Text, Value, Section } from '@adminjs/design-system';

const Dashboard = (props) => {
  const { data } = props;
  
  return (
    <Box variant="grey">
      <Header>Dashboard - Resumen del Sistema</Header>
      
      <Box flex flexDirection="row" flexWrap="wrap">
        <Section width={1/4}>
          <Text variant="lg">Usuarios Totales</Text>
          <Value value={data.totalUsers} />
        </Section>
        
        <Section width={1/4}>
          <Text variant="lg">Ingresos Hoy</Text>
          <Value value={`$${data.todayRevenue}`} />
        </Section>
        
        <Section width={1/4}>
          <Text variant="lg">Pagos Hoy</Text>
          <Value value={data.todayPayments} />
        </Section>
        
        <Section width={1/4}>
          <Text variant="lg">Hotspots Activos</Text>
          <Value value={data.activeHotspots} />
        </Section>
      </Box>
      
      <Box mt="xl">
        <Text variant="xl">Ingresos Totales: ${data.totalRevenue}</Text>
      </Box>
    </Box>
  );
};

export default Dashboard;