const NAV_ITEMS = Object.freeze([
  {
    key: 'overview',
    label: 'Overview',
    href: '/overview',
    icon: 'overview',
    group: 'top',
    permission: 'users.read',
  },
  {
    key: 'users',
    label: 'Users',
    href: '/',
    icon: 'users',
    group: 'primary',
    permission: 'users.read',
  },
  {
    key: 'teams',
    label: 'Teams',
    href: '/teams',
    icon: 'teams',
    group: 'primary',
    permission: 'teams.read',
  },
  {
    key: 'permissions',
    label: 'Permissions',
    href: '/permissions',
    icon: 'lock',
    group: 'primary',
    permission: 'roles.read',
  },
  {
    key: 'audit-logs',
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: 'history',
    group: 'primary',
    permission: 'audit.read',
  },
  {
    key: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'settings',
    group: 'secondary',
    permission: null,
  },
  {
    key: 'support',
    label: 'Support',
    href: '/support',
    icon: 'help',
    group: 'support',
    permission: null,
  },
  {
    key: 'docs',
    label: 'Docs',
    href: '/docs',
    icon: 'docs',
    group: 'support',
    permission: null,
  },
]);

const buildNavigation = (permissions = []) =>
  NAV_ITEMS.filter((item) => !item.permission || permissions.includes(item.permission)).map(
    ({ permission, ...item }) => item,
  );

module.exports = { NAV_ITEMS, buildNavigation };
