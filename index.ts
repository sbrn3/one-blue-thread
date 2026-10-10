// Must be the first import — react-native-gesture-handler installs
// its native event listeners at module load time (§05 seal risk).
import 'react-native-gesture-handler';
// Second: the first startup timing mark (src/startup/timing.ts).
import './src/startup/begin';

import { holdSplash } from './src/startup/splash';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
holdSplash();
registerRootComponent(App);
