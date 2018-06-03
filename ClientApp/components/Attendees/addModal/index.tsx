import * as React from 'react';
import { Component } from 'react';
import { connect, Dispatch } from 'react-redux';
import InputMask from 'react-input-mask';

import { Form, Input, Tooltip, Icon, Cascader, Select, Row, Col, Checkbox, Button, AutoComplete, Modal, Mention } from 'antd';
import { FormComponentProps, FormCreateOption } from 'antd/lib/form/Form';
const { toContentState, getMentions, Nav } = Mention;
const FormItem = Form.Item;
const Option = Select.Option;
const AutoCompleteOption = AutoComplete.Option;

import * as _ from 'lodash';
import moment from 'moment';
import $ from 'jquery';

import { actionCreators } from 'store/attendees';
import { Attendee } from 'store/attendees/dto';

import './index.less';

interface CustomProps extends FormComponentProps {
  onOk?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onCancel?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  attendee: Attendee | null;
}

type Props = CustomProps & typeof actionCreators;

interface State {
  attendee: Attendee;
  dobPlaceholder: string;
  dobValue: string;
  wristbandPlaceholder: string;
  wristbandNext: string;
  wristbandValue: string;
  wristbandEnabled: boolean;
  parentsLoading: boolean;
  parentsVisible: boolean;
  parentsEnabled: boolean;
  parentsSuggested: Array<typeof Nav>;
}

const dateFormat = 'MM/DD/YYYY';

const defaultState: State = {
  attendee: {
    name: {
      firstName: '',
      lastName: ''
    }
  } as Attendee,
  dobValue: '',
  dobPlaceholder: '',
  wristbandPlaceholder: '',
  wristbandNext: '',
  wristbandValue: '',
  wristbandEnabled: false,
  parentsLoading: false,
  parentsVisible: false,
  parentsEnabled: false,
  parentsSuggested: []
};

class AddAttendeeModal extends Component<Props, State> {
  componentWillMount() {
    this.setState({ ...defaultState });
  }

  componentDidMount() {
    const { setFields, validateFields } = this.props.form;

    if (this.props.attendee) {
      let a = this.props.attendee;
      setFields({
        'firstName': { value: a.name.firstName || '' },
        'lastName': { value: a.name.lastName || '' },
        'nickName': { value: a.name.nickName || '' },
        'burnerName': { value: a.burnerName || '' },
        'dob': { value: a.dob.format('MM/DD/YYYY') },
        'emailAddress': { value: a.emailAddress || '' },
        'wristband': { value: a.wristband || '' },
        'parents': { value: toContentState(_.join(_.map(a.parents, (i) => {
          return `@${this.props.getWristbandFromId(i)}`;
        }), ', ')) }
      });
      validateFields(() => { return; });
    }
  }

  render() {
    const { getFieldDecorator, setFieldsValue } = this.props.form;

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 6 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 18 },
      },
    };

    return (
      <Modal
        title={`${!this.props.attendee ? 'Manually Add' : 'Update'} Attendee`}
        visible={true}
        okText={'Ok'}
        onOk={(e) => {
          e.preventDefault();
          this.props.form.validateFields((errors, values) => {
            if (errors) {
              return;
            }

            var dob: string;
            var wristband: string;
            var emailAddress: string;
            var burnerName: string;

            if (!this.props.attendee) {
              this.props.AddAttendee({
                name: {
                  firstName: values.firstName,
                  lastName: values.lastName,
                  nickName: values.nickName
                },
                ...({ dob, wristband, emailAddress, burnerName } = values)
              }, values.reason, values.parents ? getMentions(values.parents) : null);
            } else {
              this.props.updateAttendee({
                ...this.props.attendee,
                ...{
                  name: {
                    firstName: values.firstName,
                    lastName: values.lastName,
                    nickName: values.nickName
                  },
                  ...({ dob, wristband, emailAddress, burnerName } = values)
                }
              }, true, values.parents ? getMentions(values.parents) : null);
            }

            if (this.props.onOk) {
              this.props.onOk(e);
            }
          });
        }}
        cancelText={'Cancel'}
        onCancel={(e) => {
          e.preventDefault();
          this.props.form.resetFields();
          this.setState({ ...defaultState }, () => {
            setFieldsValue({ dob: '', wristband: '' });
          });
          if (this.props.onCancel) {
            this.props.onCancel(e);
          }
        }}
        closable={false}
      >
        <Form layout="horizontal">
          <FormItem {...formItemLayout} label="First Name">
            {getFieldDecorator('firstName', {
              rules: [
                { required: true, message: 'First Name is required' },
                { validator: this.validateName }
              ],
              validateTrigger: ['onBlur']
            })(
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="Last name">
            {getFieldDecorator('lastName', {
              rules: [{ required: true, message: 'Last Name is required' }]
            })(
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="Preferred name">
            {getFieldDecorator('nickName', {})(
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="Burner name">
            {getFieldDecorator('burnerName', {})(
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="DOB">
            <div data-placeholder={this.state.dobPlaceholder}>
              {getFieldDecorator('dob', {
                rules: [
                  { message: 'Date of birth is required', required: true, transform: this.getNormalizedDOB },
                  { validator: this.validateDOB }
                ],
                normalize: this.getNormalizedDOB,
                getValueFromEvent: this.getValueForDOB,
                validateTrigger: ['onChange', 'onBlur']
              })(
                <InputMask
                  className="ant-input ant-input-lg overlayed"
                  width="10"
                  name="dob"
                  mask="99/99/9999"
                  maskChar=" "
                  onChange={(e) => this.setState({ dobValue: e.target.value })}
                  onBlur={(e) => {
                    if (e.target && e.target.value && (
                      e.target.value.length < 10 || !moment(e.target.value.length, dateFormat).isValid()
                    )) {
                      e.preventDefault();
                      e.target.focus();
                    }
                  }}
                />
              )}
            </div>
          </FormItem>
          <FormItem {...formItemLayout} label="E-Mail">
            {getFieldDecorator('emailAddress', {
            })(
              <Input />
            )}
          </FormItem>
          <FormItem {...formItemLayout} label="Wristband">
            <div data-placeholder={this.state.wristbandPlaceholder}>
              {getFieldDecorator('wristband', {
                rules: [
                  { validator: this.validateWristbandRequires },
                  { validator: this.validateWristbandValue }
                ],
                getValueFromEvent: this.getValueForWristband,
                validateTrigger: ['onChange', 'onBlur']
              })(
                <InputMask
                  className={`ant-input ant-input-lg overlayed`}
                  name="wristband"
                  mask="9999"
                  maskChar=""
                  formatChars={{ '9': '[0-9]' }}
                  disabled={!this.state.wristbandEnabled}
                  onFocus={this.onFocusForWristband}
                  onChange={(e) => this.setState({ wristbandValue: e.target.value })}
                />
              )}
            </div>
          </FormItem>
          {this.state.parentsVisible ? (
            <FormItem {...formItemLayout} label="Parents">
              {getFieldDecorator('parents', {
                rules: [{ validator: this.validateParents }]
              })(
                <Mention
                  disabled={!this.state.parentsEnabled}
                  suggestions={this.state.parentsSuggested}
                  onSearchChange={this.searchForParents}
                  notFoundContent={'No suggestions'}
                />
              )}
            </FormItem>
          ) : ''}
          <FormItem {...formItemLayout} label="Reason">
            {getFieldDecorator('reason', {
            })(
              <Input />
            )}
          </FormItem>
        </Form>
      </Modal>
    );
  }

  private validateFirstName: ((rule: any, value: any, callback: any) => void) =
    (rule: any, value: any, callback: any) => {
      // setFields({ 'firstName': { value, errors:  } });
      callback();
    }

  private searchForParents: ((value: any) => void) =
    (value: string) => {
      const searchValue = value.toLowerCase();
      const { getFieldValue } = this.props.form;

      this.props.searchForParents(getFieldValue('lastName'), searchValue, getMentions(getFieldValue('parents')), (hits) => {
        this.setState({
          parentsLoading: false,
          parentsSuggested: hits.map(hit => (
            <Nav value={hit.wristband} data={hit}>
              <span>{hit.wristband}: {hit.name.lastName}, {hit.name.firstName}</span>
            </Nav>
          ))
        });
      });
      this.setState({ parentsLoading: true });
    }

  private validateParents: ((rule: any, value: any, callback: any) => void) =
    (rule: any, value: any, callback: any) => {
      callback();
    }

  private validateDOB: ((rule: any, value: any, callback: any) => void) =
    (rule: any, value: any, callback: any) => {
      const { setFields, setFieldsValue } = this.props.form;

      if (value && value.length === 10 && !moment(value, dateFormat).isValid()) {
        setFields({ 'wristband': { value: '', errors: null } });
        this.setState({ wristbandEnabled: false }, () => callback('Date of birth is invalid'));
        return;
      }

      if (value && value.length === 10) {
        var age = moment()
          .startOf('day')
          .diff(moment(value, dateFormat), 'years', true);

        this.setState({ wristbandEnabled: true, parentsVisible: (age <= 18) });
        if (age < 13) {
          setFieldsValue({ 'reason': 'Under-13' });
        }

      } else if (value && value.length < 10 && this.state.wristbandEnabled) {
        this.setState({ wristbandEnabled: false });
      }
      callback();
    }

  private getNormalizedDOB: ((val: any) => string) =
    (val: any) => {
      return (val && val.replace(/[/ ]+$/gi, '')) || '';
    }

  private getValueForDOB: ((a: any) => string) =
    (a: any) => {
      if (a.target && a.target.value) {
        var val: string = (a.target.value || '').replace(/[/ ]+$/gi, '');
        var spaces = val.replace(/[0-9 ]/gi, '\u00A0');

        this.setState({
          dobPlaceholder: `${spaces}${dateFormat.substr(val.length, 10 - val.length)}`
        });

        return val.replace(/[/]+$/gi, '');
      }
      return '';
    }

  private validateWristbandRequires: ((rule: any, value: any, callback: any) => void) =
    (rule: any, value: any, callback: any) => {
      const { getFieldValue } = this.props.form;

      let dob = getFieldValue('dob');
      if (!dob || dob.length !== 10 || !moment(dob, dateFormat).isValid()) {
        callback('Valid date of birth must be entered first');
        $('input#dob').focus();
      }

      callback();
    }

  private validateWristbandValue: ((rule: any, value: any, callback: any) => void) =
    (rule: any, value: any, callback: any) => {
      const { getFieldValue } = this.props.form;

      if (!value || value.length < 4) {
        callback();
        return;
      }

      var ref = this.props.attendee != null
        ? this.props.attendee.id
        : moment(getFieldValue('dob'), dateFormat);

      this.props.checkIfWristbandUsed(value, ref, (used) => {
        if (used) {
          callback('Wristband unavailable');
        }
        this.setState({
          parentsEnabled: value.length === 4
        }, callback);
      });
    }

  private getValueForWristband: ((a: any) => string) =
    (a: any) => {
      if (a.target) {
        var val: string = (a.target.value || '').trim();
        var spaces = val.replace(/[0-9]/gi, '\u00A0');

        this.setState({
          wristbandPlaceholder: `${spaces}${this.state.wristbandNext.substr(spaces.length, 4 - spaces.length)}`
        });

        return val;
      }
      return '';
    }

  private onFocusForWristband: ((event: React.FocusEvent<HTMLInputElement>) => void) =
    (event: React.FocusEvent<HTMLInputElement>) => {
      const { getFieldValue, getFieldError } = this.props.form;

      if (!getFieldError('dob')) {
        this.props.getNextUnusedWristband(moment(getFieldValue('dob'), dateFormat), (next) => {
          this.setState({ wristbandNext: next, wristbandPlaceholder: next });
        });
      }
    }
}

export default Form.create()(
  connect(null, actionCreators)(AddAttendeeModal)
) as typeof AddAttendeeModal;