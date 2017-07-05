import React, { Component } from 'react';
import { bindActionCreators } from "redux";
import { connect } from 'react-redux';
import { Container, Row, Col, Pagination, PaginationItem, PaginationLink } from 'reactstrap';
import { searchFilter } from "../actions/index";
import $ from 'jquery';

class AttendeePager extends Component {
	componentDidMount() {
		var footerResize = function() {
			$('.footer')
				.css('position', $("body").height() + $(".footer").innerHeight() > $(window).height() ? "fixed" : "relative");
		};
		$(window)
			.resize(footerResize)
			.scroll(footerResize)
			.ready(footerResize);
	}

	render() {
		return (
			<Container className="footer" fluid={true} style={{ display: (typeof (this.props.pager || {}).count) === 'undefined' ? 'none' : 'inherit' }}>
				<Row>
					<Col>&nbsp;</Col>
					<Col xs="auto">
						<Pagination>
							<PaginationItem>
								<PaginationLink previous href="#" />
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">1</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">2</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">3</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">4</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink href="#">5</PaginationLink>
							</PaginationItem>
							<PaginationItem>
								<PaginationLink next href="#" />
							</PaginationItem>
						</Pagination>
					</Col>
					<Col>&nbsp;</Col>
				</Row>
			</Container>
		);
	}
}

function mapStateToProps({ pager }) {
	return { pager }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({ searchFilter }, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(AttendeePager);