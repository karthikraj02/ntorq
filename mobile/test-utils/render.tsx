import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { type ComponentType } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { ThemeProvider } from '@/theme/ThemeProvider';

const Stack = createNativeStackNavigator();

/** Renders one screen inside the same providers and navigation context the app uses. */
export async function renderScreen(
  Component: ComponentType,
  params?: Record<string, unknown>,
): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(async () => {
    renderer = create(
      <SafeAreaProvider>
        <ThemeProvider>
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen
                name="Test"
                component={Component}
                initialParams={params}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeProvider>
      </SafeAreaProvider>,
    );
  });
  return renderer as ReactTestRenderer;
}

type Json = ReturnType<ReactTestRenderer['toJSON']>;

/**
 * All visible text in the tree. Text that sits side by side inside one element
 * (`Connected to: {name}`) is joined directly; separate elements get a space.
 */
export function textOf(renderer: ReactTestRenderer): string {
  const walk = (node: Json | string | null | undefined): string => {
    if (node === null || node === undefined) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(walk).join(' ');
    const children = node.children ?? [];
    return children.every(child => typeof child === 'string')
      ? children.join('')
      : children.map(walk).join(' ');
  };
  return walk(renderer.toJSON());
}

function findByLabel(
  renderer: ReactTestRenderer,
  label: string,
  prop: string,
): ReactTestInstance {
  const matches = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props[prop] === 'function',
  );
  if (matches.length === 0)
    throw new Error(`No element labelled "${label}" with ${prop}`);
  return matches[0] as ReactTestInstance;
}

export async function press(
  renderer: ReactTestRenderer,
  label: string,
): Promise<void> {
  const target = findByLabel(renderer, label, 'onPress');
  await act(async () => {
    target.props.onPress();
  });
}

export async function typeInto(
  renderer: ReactTestRenderer,
  label: string,
  text: string,
): Promise<void> {
  const target = findByLabel(renderer, label, 'onChangeText');
  await act(async () => {
    target.props.onChangeText(text);
  });
}

export async function unmount(renderer: ReactTestRenderer): Promise<void> {
  await act(async () => {
    renderer.unmount();
  });
}
