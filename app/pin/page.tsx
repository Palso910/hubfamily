import { serverSettings } from '@/lib/server';
import PinForm from './PinForm';

export default async function Pin() {
  const s = await serverSettings();
  return <PinForm title={s.pin_title} msg={s.pin_msg} />;
}
