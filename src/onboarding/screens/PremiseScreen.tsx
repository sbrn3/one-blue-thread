import { OnboardingScreen } from '../OnboardingScreen';
import { BrandOrigin } from '../../brand/BrandOrigin';

interface PremiseScreenProps {
  onNext: () => void;
}

export function PremiseScreen({ onNext }: PremiseScreenProps) {
  return (
    <OnboardingScreen
      step="One Blue Thread"
      title="A quiet place to read Scripture."
      primaryLabel="Begin"
      onPrimary={onNext}
    >
      <BrandOrigin heading="The thread behind the name" />
    </OnboardingScreen>
  );
}
