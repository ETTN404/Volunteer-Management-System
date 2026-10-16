import { Monitor, Moon, Sun } from 'lucide-react';
import { Button, Menu, MenuContent, MenuItem, MenuTrigger } from '@/shared/ui';
import { useUiStore } from '../ui-store';
import { useResolvedTheme, useSetTheme } from '../providers/theme';

export function ThemeToggle() {
  const resolved = useResolvedTheme();
  const pref = useUiStore((s) => s.theme);
  const setTheme = useSetTheme();
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change theme">
          {resolved === 'dark' ? <Moon /> : <Sun />}
        </Button>
      </MenuTrigger>
      <MenuContent>
        {(
          [
            ['light', 'Light', Sun],
            ['dark', 'Dark', Moon],
            ['system', 'Match system', Monitor],
          ] as const
        ).map(([v, label, Icon]) => (
          <MenuItem key={v} onSelect={() => setTheme(v)} className={pref === v ? 'font-semibold' : undefined}>
            <Icon /> {label}
            {pref === v && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
