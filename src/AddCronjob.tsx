import { Widget } from '@lumino/widgets';
import { Message } from '@lumino/messaging';
import cronstrue from 'cronstrue';

const MESSSAGE_SPAN_CLASS = 'jp-Dialog-message';
const INVALID_CLASS = 'is-invalid';

export class AddCronjob extends Widget {
  _input: HTMLInputElement;
  _messageSpan: HTMLSpanElement;

  constructor() {
    super();
    this.addClass('jp-Input-Dialog');

    // Create input element
    this._input = document.createElement('input');
    this._input.classList.add('jp-mod-styled');
    this._input.placeholder = 'Write your cron expression here';
    this._input.id = 'jp-dialog-input-id';

    // Create label element
    const labelElement = document.createElement('label');
    labelElement.textContent = 'Cron schedule expression';
    labelElement.htmlFor = this._input.id;

    // Create span element for error display
    this._messageSpan = document.createElement('span');
    this._messageSpan.classList.add(MESSSAGE_SPAN_CLASS);

    // Add elements to the DOM
    this.node.appendChild(labelElement);
    this.node.appendChild(this._input);
    this.node.appendChild(this._messageSpan);
  }

  handleEvent(event: Event): void {
    this._evtChange(event);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.update();

    this._input.addEventListener('change', this);
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);

    this._input.addEventListener('change', this);
  }

  getValue(): string {
    return this._input.value;
  }

  private _evtChange(event: Event): void {
    const value: string = this._input.value;
    let humanFormat: string | undefined = undefined;

    try {
      humanFormat = cronstrue.toString(value);
    } catch (error) {
      console.warn('Failed to parse cron expression: ', error);
    }

    if (humanFormat !== undefined) {
      // Cron expression is correct: display human-readable translation
      // and remove error message
      this._messageSpan.textContent = `Translates to: ${humanFormat}`;

      this._input.classList.remove(INVALID_CLASS);
      this._messageSpan.classList.remove(INVALID_CLASS);
    } else {
      // Cron expression is wrong, display an error message
      this._input.classList.add(INVALID_CLASS);
      this._messageSpan.classList.add(INVALID_CLASS);
      this._messageSpan.textContent = 'Invalid chron syntax!';
    }
  }
}
