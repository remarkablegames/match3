import { setupCounter } from './counter';

it('sets up counter', () => {
  const button = document.createElement('button');
  setupCounter(button);
  expect(button.innerHTML).toBe('count is 0');
  button.click();
  expect(button.innerHTML).toBe('count is 1');
});
