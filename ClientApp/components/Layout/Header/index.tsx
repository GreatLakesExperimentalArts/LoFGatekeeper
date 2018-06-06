import * as React from 'react';
import { ApplicationState } from 'store';
import { connect } from 'react-redux';
import { NavLink,  } from 'react-router-dom';
import { Layout, Menu } from 'antd';

const { Header: AntHeader } = Layout;

interface Props {
  currentPath: string;
}

const SystemLayout = (props: Props) => {
  return (
    <AntHeader>
      <div className="logo" />
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[props.currentPath]}
        style={{ lineHeight: '64px' }}
      >
        <Menu.Item key="/"><NavLink to="/">Wristband Entry</NavLink></Menu.Item>
        <Menu.Item key="/volunteers"><NavLink to="/volunteers">Volunteers</NavLink></Menu.Item>
        <Menu.Item key="/incidentLog"><NavLink to="/incidentLog">Incident Log</NavLink></Menu.Item>
      </Menu>
    </AntHeader>
  );
};

const mapStateToProps: ((state: any) => Props) =
  (state) => {
    if (state.routing && state.routing.location) {
      return {
        currentPath: state.routing.location.pathname
      };
    } else {
      return {
        currentPath: '/'
      };
    }
  };

const mapDispatchToProps = (dispatch: any) => {
  return {
      // logout: () => dispatch(logout(dispatch))
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SystemLayout);