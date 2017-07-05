import React, { Component } from 'react';
import { Container, Collapse, Navbar, NavbarToggler, NavbarBrand, Nav, NavItem, NavLink } from 'reactstrap';
import AttendeeTable from '../containers/attendeeTable';
import AttendeeSearchBar from '../containers/attendeeSearchBar';
import AttendeePager from '../containers/attendeePager';

export default class App extends Component {
  render() {
    return (
        <Container fluid={true}>
          <Container className="wrapper" fluid={true}>
            <Navbar color="inverse" inverse toggleable>
              <NavbarToggler right onClick={this.toggle} />
              <NavbarBrand href="/">LoF Gate Entry System</NavbarBrand>
              <Collapse isOpen={true} navbar>
                <Nav className="ml-auto" navbar>
                  <NavItem>
                    <NavLink href="/components/">Components</NavLink>
                  </NavItem>
                  <NavItem>
                    <NavLink href="https://github.com/reactstrap/reactstrap">Github</NavLink>
                  </NavItem>
                </Nav>
              </Collapse>
            </Navbar>
            <AttendeeSearchBar />
            <AttendeeTable />
          </Container>
          <AttendeePager />
        </Container>
    );
  }
}
