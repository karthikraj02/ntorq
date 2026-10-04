import { useNavigation } from '@react-navigation/native';
import { Droplet, History, Plus } from '@/components/ui/icons';
import React from 'react';
import {
  ServiceItemCard,
  reminderTitle,
} from '@/components/service/ServiceItemCard';
import { ServiceStatusPill } from '@/components/service/ServiceStatusPill';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/Layout';
import { Row } from '@/components/ui/Row';
import { Screen } from '@/components/ui/Screen';
import { Banner } from '@/components/ui/States';
import { useServiceEvaluations } from '@/hooks/useServiceEvaluations';
import { useScooterStore } from '@/store/scooterStore';
import { useServiceStore } from '@/store/serviceStore';
import { useTheme } from '@/theme/ThemeProvider';
import { formatKm } from '@/utils/format';

export function ServiceScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { items, overall, odometerKm } = useServiceEvaluations();
  const scooterId = useScooterStore(state => state.scooter?.id);
  const reminders = useServiceStore(state => state.reminders);
  const addCustomReminder = useServiceStore(state => state.addCustomReminder);
  const untracked = reminders.filter(reminder => !reminder.enabled);

  const addCustom = () => {
    if (!scooterId) return;
    const reminder = addCustomReminder(scooterId, 'New item');
    navigation.navigate('ServiceEdit', { reminderId: reminder.id });
  };

  return (
    <Screen>
      <Card>
        <Row justify="between" align="center">
          <AppText variant="label" tone="dim">
            OVERALL
          </AppText>
          <ServiceStatusPill status={overall} />
        </Row>
        <AppText variant="heading">Odometer: {formatKm(odometerKm)}</AppText>
        <Row gap="md">
          <Button
            small
            variant="secondary"
            label="Oil change"
            icon={<Droplet size={16} color={colors.text} />}
            onPress={() => navigation.navigate('OilChange')}
          />
          <Button
            small
            variant="secondary"
            label="History"
            icon={<History size={16} color={colors.text} />}
            onPress={() => navigation.navigate('MaintenanceList')}
          />
        </Row>
      </Card>

      {odometerKm === null ? (
        <Banner
          tone="info"
          title="Odometer not set"
          message="Distance-based reminders need your current odometer reading."
          actionLabel="Set odometer"
          onAction={() => navigation.navigate('Main', { screen: 'Vehicle' })}
        />
      ) : null}
      <Banner
        tone="info"
        message="Intervals are whatever you set. This app does not assume official TVS service intervals - check your owner's manual."
      />

      <SectionHeader title="TRACKED ITEMS" />
      {items.map(({ reminder, evaluation }) => (
        <ServiceItemCard
          key={reminder.id}
          reminder={reminder}
          evaluation={evaluation}
          onPress={() =>
            navigation.navigate('ServiceEdit', { reminderId: reminder.id })
          }
        />
      ))}

      {untracked.length > 0 ? (
        <>
          <SectionHeader title="NOT TRACKED" />
          {untracked.map(reminder => (
            <Card
              key={reminder.id}
              onPress={() =>
                navigation.navigate('ServiceEdit', { reminderId: reminder.id })
              }
            >
              <AppText tone="dim">
                {reminderTitle(reminder)} - tap to start tracking
              </AppText>
            </Card>
          ))}
        </>
      ) : null}

      <Button
        variant="secondary"
        label="Add custom item"
        icon={<Plus size={18} color={colors.text} />}
        onPress={addCustom}
        fill
      />
    </Screen>
  );
}
