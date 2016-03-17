uis.directive('uiSelect',
  ['$document', 'uiSelectConfig', 'uiSelectMinErr', 'uisOffset', '$compile', '$parse', '$timeout',
  function($document, uiSelectConfig, uiSelectMinErr, uisOffset, $compile, $parse, $timeout) {

  return {
    restrict: 'EA',
    templateUrl: function(tElement, tAttrs) {
      var theme = tAttrs.theme || uiSelectConfig.theme;
      return theme + (angular.isDefined(tAttrs.multiple) ? '/select-multiple.tpl.html' : '/select.tpl.html');
    },
    replace: true,
    transclude: true,
    require: ['uiSelect', '^ngModel'],
    scope: true,
    controller: 'uiSelectCtrl',
    controllerAs: '$select',
    compile: function(tElement, tAttrs) {

      if (angular.isDefined(tAttrs.multiple))
        tElement.append("<ui-select-multiple/>").removeAttr('multiple');
      else
        tElement.append("<ui-select-single/>");

      return function(scope, element, attrs, ctrls, transcludeFn) {

        var $select = ctrls[0];
        var ngModel = ctrls[1];

        $select.generatedId = uiSelectConfig.generateId();
        $select.baseTitle = attrs.title || 'Select box';
        $select.focusserTitle = $select.baseTitle + ' focus';
        $select.focusserId = 'focusser-' + $select.generatedId;

        $select.closeOnSelect = function () {
          if (angular.isDefined(attrs.closeOnSelect)) {
            return $parse(attrs.closeOnSelect)();
          } else {
            return uiSelectConfig.closeOnSelect;
          }
        }();

        $select.onSelectCallback = $parse(attrs.onSelect);
        $select.onRemoveCallback = $parse(attrs.onRemove);

        //Set reference to ngModel from uiSelectCtrl
        $select.ngModel = ngModel;

        $select.choiceGrouped = function(group){
          return $select.isGrouped && group && group.name;
        };

        if(attrs.tabindex){
          attrs.$observe('tabindex', function(value) {
            $select.focusInput.attr("tabindex", value);
            element.removeAttr("tabindex");
          });
        }

        scope.$watch('searchEnabled', function () {
            var searchEnabled = scope.$eval(attrs.searchEnabled);
            $select.searchEnabled = searchEnabled !== undefined ? searchEnabled : uiSelectConfig.searchEnabled;
        });

        scope.$watch('sortable', function () {
            var sortable = scope.$eval(attrs.sortable);
            $select.sortable = sortable !== undefined ? sortable : uiSelectConfig.sortable;
        });

        scope.$watch(attrs.showLoader, function (newValue) {
            $select.showLoader = newValue;
        });

        attrs.$observe('disabled', function () {
          // No need to use $eval() (thanks to ng-disabled) since we already get a boolean instead of a string
          $select.disabled = attrs.disabled !== undefined ? attrs.disabled : false;
        });

        attrs.$observe('resetSearchInput', function () {
          // $eval() is needed otherwise we get a string instead of a boolean
          var resetSearchInput = scope.$eval(attrs.resetSearchInput);
          $select.resetSearchInput = resetSearchInput !== undefined ? resetSearchInput : true;
        });

        attrs.$observe('tagging', function () {
          if (attrs.tagging !== undefined) {
            // $eval() is needed otherwise we get a string instead of a boolean
            var taggingEval = scope.$eval(attrs.tagging);
            $select.tagging = {isActivated: true, fct: taggingEval !== true ? taggingEval : undefined};
          } else {
            $select.tagging = {isActivated: false, fct: undefined};
          }
        });

        attrs.$observe('actionButtons', function () {
          if(attrs.actionButtons !== undefined) {
            // $eval() is needed otherwise we get a string instead of a boolean
            var actionButtonsEval = scope.$eval(attrs.actionButtons);
            $select.actionButtons = {isActivated: true, fct: actionButtonsEval !== true ? actionButtonsEval : undefined};
          } else {
            $select.actionButtons = {isActivated: false, fct: undefined};
          }
        });

        attrs.$observe('taggingLabel', function () {
          if (attrs.tagging !== undefined ) {
            if (attrs.taggingLabel === 'false') {
              $select.taggingLabel = false;
            } else {
              $select.taggingLabel = attrs.taggingLabel !== undefined ? attrs.taggingLabel : '(new)';
            }
          }
        });

        attrs.$observe('taggingTokens', function () {
          if (attrs.tagging !== undefined) {
            var tokens = attrs.taggingTokens !== undefined ? attrs.taggingTokens.split('|') : [',','ENTER'];
            $select.taggingTokens = {isActivated: true, tokens: tokens };
          }
        });

        //Automatically gets focus when loaded
        if (angular.isDefined(attrs.autofocus)){
          $timeout(function (){
            $select.setFocus();
          });
        }

        //Gets focus based on scope event name (e.g. focus-on='SomeEventName')
        if (angular.isDefined(attrs.focusOn)){
          scope.$on(attrs.focusOn, function () {
              $timeout(function (){
                $select.setFocus();
              });
          });
        }


        function onDocumentClick(e) {
          if (!$select.open) return; //Skip it if dropdown is close

          var contains = false;

          if (window.jQuery) {
            // Firefox 3.6 does not support element.contains()
            // See Node.contains https://developer.mozilla.org/en-US/docs/Web/API/Node.contains
            contains = window.jQuery.contains(element[0], e.target);
          } else {
            contains = element[0].contains(e.target);
          }

          if (!contains && !$select.clickTriggeredSelect) {
            //Will lose focus only with certain targets
            var focusableControls = ['input','button','textarea'];
            var targetScope = angular.element(e.target).scope(); //To check if target is other ui-select
            var skipFocusser = targetScope && targetScope.$select && targetScope.$select !== $select; //To check if target is other ui-select
            if (!skipFocusser) skipFocusser =  ~focusableControls.indexOf(e.target.tagName.toLowerCase()); //Check if target is input, button or textarea
            $select.close(skipFocusser);
            scope.$digest();
          }
          $select.clickTriggeredSelect = false;
        }

        $document.on('click', onDocumentClick);

        scope.$on('$destroy', function () {
          $document.off('click', onDocumentClick);
        });

        transcludeFn(scope, function(clone) {
          var transcluded = angular.element('<div>').append(clone);

          var transcludedMatch = transcluded.querySelectorAll('.ui-select-match');
          transcludedMatch.removeAttr('ui-select-match');
          transcludedMatch.removeAttr('data-ui-select-match');
          if (transcludedMatch.length !== 1) {
            throw uiSelectMinErr('transcluded', "Expected 1 .ui-select-match but got '{0}'.", transcludedMatch.length);
          }
          element.querySelectorAll('.ui-select-match').replaceWith(transcludedMatch);

          var transcludedChoices = transcluded.querySelectorAll('.ui-select-choices');
          transcludedChoices.removeAttr('ui-select-choices');
          transcludedChoices.removeAttr('data-ui-select-choices');
          if (transcludedChoices.length !== 1) {
            throw uiSelectMinErr('transcluded', "Expected 1 .ui-select-choices but got '{0}'.", transcludedChoices.length);
          }
          element.querySelectorAll('.ui-select-choices').replaceWith(transcludedChoices);
        });

        var appendToBody = scope.$eval(attrs.appendToBody);
        if ((appendToBody !== undefined ? appendToBody : uiSelectConfig.appendToBody) || attrs.appendTo) {
          scope.$watch('$select.open', function(isOpen) {
            if (isOpen) {
              positionDropdown();
            } else {
              resetDropdown();
            }
          });

          scope.$on('$destroy', function () {
            resetDropdown();
          });
        }

        var placeholder = null,
            originalWidth = '';

        function positionDropdown() {
          var offset = uisOffset(element);

          placeholder = angular.element('<div class="ui-select-placeholder"></div>');
          placeholder[0].style.width = offset.width + 'px';
          placeholder[0].style.height = offset.height + 'px';
          element.after(placeholder);

          originalWidth = element[0].style.width;

          if (attrs.appendTo) {
            var parent = $document.find(attrs.appendTo);
            var parentOffset = parent.offset();
            parent.append(element);
            element[0].style.left = (offset.left - parentOffset.left) + 'px';
            element[0].style.top = (offset.top - parentOffset.top) + 'px';
          }else {
            $document.find('body').append(element);
            element[0].style.left = offset.left + 'px';
            element[0].style.top = offset.top + 'px';
          }

          element[0].style.position = 'absolute';
          element[0].style.width = offset.width + 'px';
        }

        function resetDropdown() {
          if (placeholder === null) {
            return;
          }

          placeholder.replaceWith(element);
          placeholder = null;

          element[0].style.position = '';
          element[0].style.left = '';
          element[0].style.top = '';
          element[0].style.width = originalWidth;
        }
      };
    }
  };
}]);
