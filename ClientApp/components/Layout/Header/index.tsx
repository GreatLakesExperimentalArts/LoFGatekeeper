import * as React from 'react';
import { Layout, Menu } from 'antd';

const { Header: AntHeader } = Layout;

export default class Header extends React.Component<{}, {}> {
  render() {
    return (
      <AntHeader>
        <div className="logo" />
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['Wristbands']}
          style={{ lineHeight: '64px' }}
        >
          <Menu.Item key="Wristbands">Wristband Entry</Menu.Item>
          <Menu.Item key="Volunteers">Volunteers</Menu.Item>
        </Menu>
      </AntHeader>
    );
  }
}