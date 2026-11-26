import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DatePicker, TimePicker } from './calendar';

function TimeHarness({ initial = '09:00' }: { initial?: string }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <TimePicker value={v} onChange={setV} />
      <output data-testid="value">{v}</output>
    </>
  );
}

describe('TimePicker', () => {
  it('picks any minute, not just quarter hours', async () => {
    const user = userEvent.setup();
    render(<TimeHarness />);
    await user.click(screen.getByRole('button', { name: /9:00 am/i }));
    await user.click(within(screen.getByRole('listbox', { name: 'Hour' })).getByRole('option', { name: '2' }));
    await user.click(within(screen.getByRole('listbox', { name: 'Minute' })).getByRole('option', { name: '37' }));
    await user.click(within(screen.getByRole('listbox', { name: 'AM or PM' })).getByRole('option', { name: 'PM' }));
    expect(screen.getByTestId('value')).toHaveTextContent('14:37');
  });
});

describe('DatePicker with yearPicker', () => {
  it('offers month and year dropdowns for far-away dates like birthdays', async () => {
    const user = userEvent.setup();
    render(<DatePicker yearPicker value="" onChange={() => {}} max="2026-11-26" placeholder="Select your birthday" />);
    await user.click(screen.getByRole('button', { name: /select your birthday/i }));
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    const years = within(selects[1]!).getAllByRole('option').map((o) => o.textContent);
    expect(years).toContain('1990');
    expect(years).not.toContain('2027');
  });
});
