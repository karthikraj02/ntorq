import { useNavigation } from '@react-navigation/native';
import { Activity } from '@/components/ui/icons';
import React from 'react';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Row } from '@/components/ui/Row';
import { useVehicleStore } from '@/store/vehicleStore';
import { useTheme } from '@/theme/ThemeProvider';

export function DiagnosticStatusCard() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const diagnostics = useVehicleStore(state => state.capabilities.diagnostics);
  const available = diagnostics === 'verified';

  return (
    <Card
      onPress={() => navigation.navigate('Main', { screen: 'Diagnostics' })}
      accessibilityLabel="Diagnostics"
    >
      <Row align="center" gap="sm">
        <Activity size={18} color={colors.textDim} />
        <AppText variant="label" tone="dim">
          DIAGNOSTICS
        </AppText>
      </Row>
      <AppText variant="heading" tone={available ? 'default' : 'dim'}>
        {available ? 'Diagnostics available' : 'No diagnostic data available'}
      </AppText>
    </Card>
  );
}
