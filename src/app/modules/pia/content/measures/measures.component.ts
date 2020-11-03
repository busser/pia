import { Component, Input, ElementRef, Renderer2, OnInit, OnDestroy, NgZone } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';


import { GlobalEvaluationService } from 'src/app/services/global-evaluation.service';
import { Answer } from 'src/app/models/answer.model';
import { Evaluation } from 'src/app/models/evaluation.model';
import { KnowledgeBaseService } from 'src/app/services/knowledge-base.service';
import { ModalsService } from 'src/app/services/modals.service';
import { Measure } from 'src/app/models/measure.model';
import { AnswerService } from 'src/app/services/answer.service';

@Component({
  selector: 'app-measures',
  templateUrl: './measures.component.html',
  styleUrls: ['./measures.component.scss']
})
export class MeasuresComponent implements OnInit, OnDestroy {

  @Input() measure: Measure;
  @Input() item: any;
  @Input() section: any;
  @Input() pia: any;
  editor: any;
  elementId: string;
  evaluation: Evaluation = new Evaluation();
  displayDeleteButton = true;
  measureForm: FormGroup;
  measureModel: Measure = new Measure();
  editTitle = true;

  constructor(
    public globalEvaluationService: GlobalEvaluationService,
    private el: ElementRef,
    private modalsService: ModalsService,
    private knowledgeBaseService: KnowledgeBaseService,
    private answerService: AnswerService,
    private ngZone: NgZone) { }

  ngOnInit() {
    this.measureForm = new FormGroup({
      measureTitle: new FormControl(),
      measureContent: new FormControl()
    });
    this.measureModel.pia_id = this.pia.id;
    this.measureModel.get(this.measure.id).then(() => {
      this.knowledgeBaseService.toHide.push(this.measure.title);
      this.elementId = 'pia-measure-content-' + this.measure.id;
      if (this.measureModel) {
        this.measureForm.controls['measureTitle'].patchValue(this.measureModel.title);
        this.measureForm.controls['measureContent'].patchValue(this.measureModel.content);
        if (this.measureModel.title) {
          this.measureForm.controls['measureTitle'].disable();
          this.editTitle = false;
        }
      }

      const measureTitleTextarea = document.getElementById('pia-measure-title-' + this.measure.id);
      if (measureTitleTextarea) {
        this.autoTextareaResize(null, measureTitleTextarea);
      }
    });
  }

  ngOnDestroy() {
    tinymce.remove(this.editor);
  }

  /**
   * Enable auto resizing on measure title textarea.
   * @param {*} event - Any Event.
   * @param {HTMLElement} textarea - Any textarea.
   */
  autoTextareaResize(event: any, textarea?: HTMLElement) {
    if (event) {
      textarea = event.target;
    }
    if (textarea.clientHeight < textarea.scrollHeight) {
      textarea.style.height = textarea.scrollHeight + 'px';
      if (textarea.clientHeight < textarea.scrollHeight) {
        textarea.style.height = (textarea.scrollHeight * 2 - textarea.clientHeight) + 'px';
      }
    }
  }

  /**
   * Change evaluation.
   * @param {*} evaluation - Any Evaluation.
   */
  evaluationChange(evaluation: any) {
    this.evaluation = evaluation;
  }

  /**
   * Enables edition for measure title.
   */
  measureTitleFocusIn() {
    if (this.globalEvaluationService.answerEditionEnabled) {
      this.editTitle = true;
      this.measureForm.controls['measureTitle'].enable();
      const measureTitleTextarea = document.getElementById('pia-measure-title-' + this.measure.id);
      setTimeout(() => {
        measureTitleTextarea.focus();
      }, 200);
    }
  }

  /**
   * Disables title field when losing focus from it.
   * Shows measure edit button.
   * Saves data from title field.
   * @param {event} event - Any Event.
   */
  measureTitleFocusOut(event: Event) {
    let userText = this.measureForm.controls['measureTitle'].value;
    if (userText) {
      userText = userText.replace(/^\s+/, '').replace(/\s+$/, '');
      this.editTitle = false;
    }
    this.measureModel.pia_id = this.pia.id;
    const previousTitle = this.measureModel.title;
    this.measureModel.title = userText;
    this.measureModel.update().then(() => {
      if (previousTitle !== this.measureModel.title) {
        this.knowledgeBaseService.removeItemIfPresent(this.measureModel.title, previousTitle);
      }

      // Update tags
      this.answerService.getByReferenceAndPia(this.pia.id, 324).then((answer: Answer) => {
        if (answer.data && answer.data.list) {
          const index = answer.data.list.indexOf(previousTitle);
          if (~index) {
            answer.data.list[index] = this.measureModel.title;
            this.answerService.update(answer);
          }
        }
      });

      this.answerService.getByReferenceAndPia(this.pia.id, 334).then((answer: Answer) => {
        if (answer.data && answer.data.list) {
          const index = answer.data.list.indexOf(previousTitle);
          if (~index) {
            answer.data.list[index] = this.measureModel.title;
            this.answerService.update(answer);
          }
        }
      });

      this.answerService.getByReferenceAndPia(this.pia.id, 344).then((answer: Answer) => {
        if (answer.data && answer.data.list) {
          const index = answer.data.list.indexOf(previousTitle);
          if (~index) {
            answer.data.list[index] = this.measureModel.title;
            this.answerService.update(answer);
          }
        }
      });

      if (this.measureForm.value.measureTitle && this.measureForm.value.measureTitle.length > 0) {
        this.measureForm.controls['measureTitle'].disable();
      }

      this.globalEvaluationService.validate();
    });

  }

  /**
   * Loads WYSIWYG editor for measure answer.
   */
  measureContentFocusIn() {
    if (this.globalEvaluationService.answerEditionEnabled) {
      this.loadEditor();
    }
  }

  /**
   * Disables content field when losing focus from it.
   * Shows measure edit button.
   * Saves data from content field.
   */
  measureContentFocusOut() {
    this.knowledgeBaseService.placeholder = null;
    this.editor = null;
    let userText = this.measureForm.controls['measureContent'].value;
    if (userText) {
      userText = userText.replace(/^\s+/, '').replace(/\s+$/, '');
    }
    this.measureModel.pia_id = this.pia.id;
    this.measureModel.content = userText;
    this.measureModel.update().then(() => {
      this.ngZone.run(() => {
        this.globalEvaluationService.validate();
      });
    });
  }

  /**
   * Shows or hides a measure.
   * @param {*} event - Any Event.
   */
  displayMeasure(event: any) {
    const accordeon = this.el.nativeElement.querySelector('.pia-measureBlock-title button');
    accordeon.classList.toggle('pia-icon-accordeon-down');
    const displayer = this.el.nativeElement.querySelector('.pia-measureBlock-displayer');
    displayer.classList.toggle('close');

    // Display comments/evaluations for measures
    const commentsDisplayer = document.querySelector('.pia-commentsBlock-measure-' + this.measure.id);
    const evaluationDisplayer = document.querySelector('.pia-evaluationBlock-measure-' + this.measure.id);
    if (event.target.getAttribute('data-status') === 'hide') {
      event.target.removeAttribute('data-status');
      commentsDisplayer.classList.remove('hide');
      if (evaluationDisplayer && this.evaluation.status > 0) {
        evaluationDisplayer.classList.remove('hide');
      }
    } else {
      event.target.setAttribute('data-status', 'hide');
      commentsDisplayer.classList.add('hide');
      if (evaluationDisplayer) {
        evaluationDisplayer.classList.add('hide');
      }
    }
  }

  /**
   * Allows an user to remove a measure.
   * @param {string} measureId - A measure id.
   */
  removeMeasure(measureId: string) {
    const measuresCount = document.querySelectorAll('.pia-measureBlock');
    if (measuresCount && measuresCount.length <= 1) {
      this.modalsService.openModal('not-enough-measures-to-remove');
    } else {
      localStorage.setItem('measure-id', measureId);
      this.modalsService.openModal('remove-measure');
    }
  }

  /**
   * Loads wysiwyg editor.
   */
  loadEditor() {
    this.knowledgeBaseService.placeholder = this.measure.placeholder;
    tinymce.init({
      branding: false,
      menubar: false,
      statusbar: false,
      plugins: 'autoresize lists',
      forced_root_block : false,
      autoresize_bottom_margin: 30,
      auto_focus: this.elementId,
      autoresize_min_height: 40,
      content_style: 'body {background-color:#eee!important;}' ,
      selector: '#' + this.elementId,
      toolbar: 'undo redo bold italic alignleft aligncenter alignright bullist numlist outdent indent',
      skin_url: 'assets/skins/lightgray',
      setup: editor => {
        this.editor = editor;
        editor.on('focusout', () => {
          this.measureForm.controls['measureContent'].patchValue(editor.getContent());
          this.measureContentFocusOut();
          tinymce.remove(this.editor);
        });
      },
    });
  }
}
