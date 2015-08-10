/**
 * @author xuld
 */

// #require ../utility/date
// #require ../dom/animate

/**
 * 表示一个日历组件。
 */
var Calender = Control.extend({

    /**
     * 获取或设置现在选中的时间。
     */
    value: null,

    /**
     * 获取或设置当前日历显示的时间。
     */
    displayValue: null,

    /**
     * 获取或设置当前日历显示的时间。
     */
    now: null,

    /**
     * 指示当前选择的范围。
     */
    format: 'yyyy/M/d',

    /**
     * 获取或设置当前显示的视图。可能的值为'day'、'month'、'year'或'decade'。
     */
    view: null,

    /**
     * 获取或设置可选择的最小值。
     */
    min: null,

    /**
     * 获取或设置可选择的最大值。
     */
    max: null,

    /**
	 * 当被子类重写时，负责初始化当前控件。
	 * @protected
	 * @virtual
	 */
    init: function () {

        var me = this;

        // 初始化界面。
        me.dom.html(Calender.locale.tpl);

        me.min = Date.from(me.min);
        me.max = Date.from(me.max);

        // 初始化时间字段。
        me.now = Date.from(me.now) || new Date();
        me.value = Date.from(me.value) || me.now;
        me.displayValue = Date.from(me.displayValue) || new Date(+me.now);

        // 初始化时间输入框。
        me.setFormat(me.format);

        // 初始化今天输入框。
        me.setNow(me.now);

        // 绑定事件。
        me.elem.on('click', '.x-calender-title', me.onTitleClick, me);
        me.elem.on('click', '.x-calender-prev', me.onPrevClick, me);
        me.elem.on('click', '.x-calender-next', me.onNextClick, me);
        me.elem.on('click', '.x-calender-now', function (e) { me.onNowClick(this, e); });
        me.elem.on('click', '.x-calender-body td', function (e) { me.onItemClick(this, e); });
        me.elem.on('change', '.x-calender-time input', function (e) { me.onTimeChange(this, e); });

        // 载入时间部分。
        me.loadHours(me.displayValue);

        // 初始化视图。
        if (!me.view) {
            me.view = /d/.test(me.format) ? 'day' : 'year';
        }
        me.setView(me.view);

    },

    /**
     * 设置显示的日期格式。
     */
    setFormat: function (value) {
        this.format = value;
        var showTime = /[Hhms]/.test(value), inputs;
        if (showTime) {
            inputs = this.elem.querySelectorAll('.x-calender-time input');
            inputs[0].readOnly = value.indexOf('H') < 0;
            inputs[1].readOnly = value.indexOf('m') < 0;
            inputs[2].readOnly = value.indexOf('s') < 0;
        }
        this.elem.querySelector('.x-calender-time').toggle(showTime);
    },

    /**
     * 设置显示的当前时间。
     */
    setNow: function (value) {
        this.now = value;
        value = Date.from(value);
        var now = this.elem.querySelector('.x-calender-now');
        now.setAttribute('x-value', +value);
        now.innerHTML = value.format(Calender.locale.today);
    },

    /**
     * 当用户点击某一项时执行。
     * @param {Element} item 正在被点击的项。
     * @protected
     * @virtual
     */
    onItemClick: function (item, e) {
        e.preventDefault();
        // 如果此项是允许点击的。则生成新的日期对象，并设置为当前值。
        if (!item.classList.contains('x-calender-invalid')) {
            Calender.views[this.view].select(this, item, e);
        }
    },

    /**
     * 当用户点击上一页时执行。
     * @param {Element} item 正在被点击的项。
     * @protected
     * @virtual
     */
    onPrevClick: function (e) {
        e.preventDefault();
        Calender.views[this.view].movePage(this, -1);
        this.setView(this.view, 'slideRight');
    },

    /**
     * 当用户点击下一页时执行。
     * @param {Element} item 正在被点击的项。
     * @protected
     * @virtual
     */
    onNextClick: function (e) {
        e.preventDefault();
        Calender.views[this.view].movePage(this, 1);
        this.setView(this.view, 'slideLeft');
    },

    /**
     * 当用户点击标题时执行。
     * @param {Element} item 正在被点击的项。
     * @protected
     * @virtual
     */
    onTitleClick: function (e) {
        e.preventDefault();
        // 切换显示到父视图。
        Calender.views[this.view].parentView && this.setView(Calender.views[this.view].parentView, 'zoomIn');
    },

    /**
     * 当用户点击当前时间时执行。
     * @param {Element} item 正在被点击的项。
     * @protected
     * @virtual
     */
    onNowClick: function (item, e) {
        this.selectItem(item);
    },

    /**
     * 当用户更新时间时执行。
     */
    onTimeChange: function (item, e) {

        // 更新时间部分。
        var value = new Date(+this.value);
        this.saveHours(value);

        // 如果超过最大最小值，则恢复数据。
        if ((this.min && value < this.min) || (this.max && value > this.max)) {
            this.loadHours(value);
        } else {
            this.value = value;
            this.trigger('change');
        }
    },

    keyNav: {
        up: function () {
            Calender.views[this.view].moveRow(this, -1);
        },
        down: function () {
            Calender.views[this.view].moveRow(this, 1);
        },
        left: function () {
            Calender.views[this.view].moveColumn(this, -1);
        },
        right: function () {
            Calender.views[this.view].moveColumn(this, 1);
        },
        enter: function (e) {
            var item = this.elem.querySelector('.x-calender-selected');
            item ? this.onItemClick(item, e) : this.trigger('select', this.value);
        }
    },

    /**
     * 当被用户重写时，负责返回指定的日期的类名。
     * @protected
     * @virtual
     */
    getClassName: function (date) {
        return '';
    },

    /**
     * 当被用户重写时，负责返回指定的日期的节日。
     * @protected
     * @virtual
     */
    getHoliday: function (date) {
        return '';
    },

    /**
     * 设置当前显示的视图。
     * @param {String} view 视图名。可能的值为 'day'、'month'、'year'或'decade'。
     * @param {String} animation 切换使用的渐变效果。可能值有： null、'slideLeft'、'slideRight'、 'zoomIn'或'zoomOut'。
     * @returns this
     */
    setView: function (view, animation) {

        // 保存当前显示的视图。
        this.view = view;

        // 渲染视图。
        var me = this, body = me.elem.querySelector('.x-calender-body'),
            oldContainer = body.lastChild,
            newContainer = !animation && me.newContainer || body.appendChild(document.createElement('div')),
            reverse,
            newFrom,
            to,
            oldTo;

        // 记住高宽。
        var body = me.elem.querySelector('.x-calender-body');
        if (!body.style.width && body.offsetHeight) {
            body.style.height = body.offsetHeight + 'px';
            body.style.width = body.offsetWidth + 'px';
        }

        // 渲染当前视图的内容。
        newContainer.setStyle('transform', 'translateX(0) scale(1, 1)');
        Calender.views[view].render(this, newContainer, this.elem.querySelector('.x-calender-title'));

        if (oldContainer) {
            if (animation) {

                reverse = /(Out|Right)$/.test(animation);

                if (/^zoom/.test(animation)) {
                    var container = reverse ? oldContainer : newContainer,
                        actived = container.querySelector('.x-calender-actived'),
                        activedRect = actived.getRect(),
                        tableRect = container.getRect(),
                        origin = (activedRect.left - tableRect.left + activedRect.width / 2) + 'px ' + (activedRect.top - tableRect.top + activedRect.height / 2) + 'px';

                    newFrom = {
                        transform: 'scale(4, 4)',
                        transformOrigin: origin,
                        opacity: 0
                    };

                    to = {
                        transform: 'scale(1, 1)',
                        transformOrigin: origin,
                        opacity: 1
                    };

                    oldTo = {
                        transform: 'scale(0, 0)',
                        transformOrigin: origin,
                        opacity: 0
                    };

                } else {

                    newFrom = {
                        transform: 'translateX(100%)',
                    };

                    to = {
                        transform: 'translateX(0)',
                    };

                    oldTo = {
                        transform: 'translateX(-100%)',
                    };

                }

                if (reverse) {
                    reverse = oldTo;
                    oldTo = newFrom;
                    newFrom = reverse;
                }

                newContainer.style.position = '';
                oldContainer.style.position = 'absolute';

                me.newContainer = newContainer;
                newContainer.animate(newFrom, to, null, null, 'linear');

                // 渐变缩小移除旧表。
                oldContainer.animate(to, oldTo, function () {
                    oldContainer.removeSelf();
                    me.newContainer = null;
                }, null, 'linear');

            } else if (!me.newContainer) {
                oldContainer.removeSelf();
            }
        }

        this.trigger('update');

        return this;

    },

    /**
     * 模拟用户选中某一项。
     * @param {Element} item 需要选中的项。
     * @returns this
     */
    selectItem: function (item) {
        var value = new Date(+item.getAttribute('x-value'));
        this.saveHours(value);
        if (!(this.min && value < this.min) && !(this.max && value > this.max) && this.trigger('select', value)) {
            this.setValue(value);
        }
        return this;
    },

    /**
     * 保存时间部分的值。
     */
    saveHours: function (date) {
        var inputs = this.elem.querySelectorAll('.x-calender-time input');
        date.setHours(+inputs[0].value);
        date.setMinutes(+inputs[1].value);
        date.setSeconds(+inputs[2].value);
    },

    /**
     * 读取时间部分的值。
     */
    loadHours: function (value) {
        var inputs = this.elem.querySelectorAll('.x-calender-time input');
        value = Date.from(value.format(this.format));
        inputs[0].value = value.getHours();
        inputs[1].value = value.getMinutes();
        inputs[2].value = value.getSeconds();
    },

    /**
     * 设置可选日期的范围。
     * @param {Date} min 要设置的最小值。如果不设置，可传递 null。
     * @param {Date} max 要设置的最大值。如果不设置，可传递 null。
     */
    setRange: function (min, max) {
        this.min = Date.from(min);
        this.max = Date.from(max);
        if (this.value < this.min) {
            this.setValue(this.min);
        }
        if (this.value > this.max) {
            this.setValue(this.max);
        }
        return this;
    },

    /**
     * 设置当前日历的值。
     * @param {Date} value 要设置的值。
     */
    setValue: function (value) {
        var me = this;
        if (+me.value !== +value) {
            me.value = value;
            me.displayValue = new Date(+value);
            me.loadHours(value);
            me.setView(/d/.test(me.format) ? 'day' : /M/.test(me.format) ? 'month' : 'year');
            me.trigger('change');
        }
        return me;
    },

    /**
     * 获取当前日历的值。
     */
    getValue: function () {
        return this.value;
    }

});

Calender._generateTable = function (className, rowCount, colCount, generator, header) {
    var html = '<table class="' + className + '">' + (header || ''), rowIndex, colIndex, index = 0;
    for (rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        html += '<tr>';
        for (colIndex = 0; colIndex < colCount; colIndex++) {
            html += generator(index++);
        }
        html += '</tr>';
    }
    return html + '</table>';
};

Calender.views = {

    day: {

        /**
         * 向指定的 *calender* 内的 *contentNode* 节点渲染日视图。
         * @param {MonthCalender} calender 要渲染的目标日历对象。
         */
        render: function (calender, container, title) {

            var displayValue = calender.displayValue,
                value = calender.value,
                min = calender.min ? +calender.min.toDay() : NaN,
                max = calender.max ? +calender.max.toDay() : NaN,
                value = calender.value ? +calender.value.toDay() : 0,
                now = +calender.now.toDay(),
                tmpDate = new Date(displayValue.getFullYear(), displayValue.getMonth(), 1),
                weekHtml = '',

                // 一次绘制会存在3个月，此序号标记正在绘制哪一月。
                monthDelta = 0,

                tmpDateValue,
                day;

            // 调整日期为星期天。
            day = tmpDate.getDay();
            tmpDate = tmpDate.addDay(day === 0 ? -7 : -day);

            // 设置顶部标题。
            title.innerHTML = displayValue.format(Calender.locale.month);

            // 绘制星期。
            weekHtml += '<tr class="x-calender-weeks">';
            for (i = 0; i < Calender.locale.weeks.length; i++) {
                weekHtml += '<th>' + Calender.locale.weeks[i] + '</th>';
            }
            weekHtml += '</tr>';

            // 设置内容。
            container.innerHTML = Calender._generateTable('x-calender-days', 6, 7, function () {

                tmpDateValue = +tmpDate;

                // 如果是第一天，切换 是否当前月 。
                day = tmpDate.getDate();
                if (day == 1) {
                    monthDelta++;
                }

                var holiday = Calender.locale.holidays[tmpDate.format('M-d')] || calender.getHoliday(tmpDate),
                    html = '';

                html += '<td x-value="' + tmpDateValue + '"' + (holiday ? ' title="' + holiday + '"' : '') + ' class="' + calender.getClassName(tmpDate);

                if (holiday) { html += ' x-calender-holiday'; }

                // 超过日期范围。
                if (tmpDateValue < min || tmpDateValue > max) { html += ' x-calender-invalid'; }

                // 当前选中的日期。
                if (tmpDateValue === value) { html += ' x-calender-selected'; }

                // 今天。
                if (tmpDateValue === now) { html += ' x-calender-actived'; }

                html += monthDelta !== 1 ? ' x-calender-alt">' + day + '</td>' : '"><a href="javascript:;">' + day + '</a></td>';

                // 计算下一天。
                tmpDate.setDate(day + 1);

                return html;

            }, weekHtml);

        },

        parentView: 'month',

        select: function (calender, item, e) {

            // 如果是 alt， 则是上个月或下个月, 则切换为新视图。
            // 否则，设置并更新当前的值。
            if (item.classList.contains('x-calender-alt')) {
                var value = calender.value = new Date(+item.getAttribute('x-value'));
                return calender[value.getDate() < 15 ? 'onNextClick' : 'onPrevClick'](e);
            }

            return calender.selectItem(item);
        },

        movePage: function (calender, delta) {
            calender.displayValue = calender.displayValue.addMonth(delta);
        },

        moveRow: function (calender, delta) {
            this.moveColumn(calender, delta * 7);
        },

        moveColumn: function (calender, delta) {
            var oldMonth = calender.value.getMonth();
            calender.value = calender.value.addDay(delta);
            calender.displayValue = new Date(+calender.value);
            oldMonth -= calender.value.getMonth();
            calender.setView(calender.view, oldMonth ? oldMonth > 0 ? 'slideRight' : 'slideLeft' : null);
        }

    },

    month: {

        /**
         * 向指定的 *calender* 内的 *contentNode* 节点渲染日视图。
         * @param {MonthCalender} calender 要渲染的目标日历对象。
         */
        render: function (calender, container, title) {

            var displayValue = calender.displayValue,
                value = this.picker === 'month' && calender.value,
                year = displayValue.getFullYear();

            // 设置顶部标题。
            title.innerHTML = year;

            // 设置内容。
            container.innerHTML = Calender._generateTable('x-calender-months', 3, 4, function (month) {

                function compare(date) {
                    return date ? year === date.getFullYear() ? month - date.getMonth() : year - date.getFullYear() : NaN;
                }

                var html = '<td x-value="' + month + '" class="';

                // 超过日期范围。
                if (compare(calender.min) < 0 || compare(calender.max) > 0) { html += ' x-calender-invalid'; }

                // 当前选中的日期。
                if (compare(value) === 0) { html += ' x-calender-selected'; }

                // 今天。
                if (compare(displayValue) === 0) { html += ' x-calender-actived'; }

                html += '"><a href="javascript:;">' + Calender.locale.months[month] + '</a></td>';

                return html;

            });

        },

        parentView: 'year',

        select: function (calender, item) {

            // 如果不存在日选择器，则直接选择当前月份。
            if (!/d/.test(calender.format)) {
                return calender.selectItem(item);
            }

            var actived = calender.elem.querySelector('.x-calender-actived');
            actived && actived.classList.remove('x-calender-actived');
            item.classList.add('x-calender-actived');
            calender.displayValue.setMonth(item.getAttribute('x-value'));
            calender.setView('day', 'zoomOut');
        },

        movePage: function (calender, delta) {
            calender.displayValue = calender.displayValue.addMonth(delta * 12);
        },

        moveRow: function (calender, delta) {
            this.moveColumn(calender, delta * 4);
        },

        moveColumn: function (calender, delta) {
            var oldMonth = calender.value.getYear();
            calender.value = calender.value.addMonth(delta);
            calender.displayValue = new Date(+calender.value);
            oldMonth -= calender.value.getYear();
            calender.setView(calender.view, oldMonth ? oldMonth > 0 ? 'slideRight' : 'slideLeft' : null);
        }

    },

    year: {

        render: function (calender, container, title) {

            var displayValue = calender.displayValue,
                value = this.picker === 'year' && calender.value,
                startYear = Math.floor(displayValue.getFullYear() / 10) * 10 - 1,
                year = startYear;

            // 设置顶部标题。
            title.innerHTML = (startYear + 1) + '-' + (startYear + 10);

            // 设置内容。
            container.innerHTML = Calender._generateTable('x-calender-years', 3, 4, function (yearIndex) {

                function compare(date) {
                    return date ? year - date.getFullYear() : NaN;
                }

                var html = '<td x-value="' + year + '" class="';

                // 超过日期范围。
                if (compare(calender.min) < 0 || compare(calender.max) > 0) { html += ' x-calender-invalid'; }

                // 当前选中的日期。
                if (compare(value) === 0) { html += ' x-calender-selected'; }

                // 今天。
                if (compare(displayValue) === 0) { html += ' x-calender-actived'; }

                html += yearIndex === 0 || yearIndex === 11 ? ' x-calender-alt">' + year + '</td>' : '"><a href="javascript:;">' + year + '</a></td>';

                year++;

                return html;

            });

        },

        parentView: 'decade',

        select: function (calender, item) {

            // 如果不存在日选择器，则直接选择当前月份。
            if (!/[Md]/.test(calender.format)) {
                return calender.selectItem(item);
            }

            var actived = calender.elem.querySelector('.x-calender-actived');
            actived && actived.classList.remove('x-calender-actived');
            item.classList.add('x-calender-actived');
            calender.displayValue.setFullYear(item.getAttribute('x-value'));
            calender.setView(!/M/.test(calender.format) ? 'day' : 'month', 'zoomOut');
        },

        movePage: function (calender, delta) {
            calender.displayValue = calender.displayValue.addMonth(delta * 1200);
        }

    },

    decade: {

        render: function (calender, container, title) {

            var displayValue = calender.displayValue,
                value = this.picker === 'year' && calender.value,
                startYear = Math.floor(displayValue.getFullYear() / 100) * 100 - 10,
                year = startYear;

            // 设置顶部标题。
            title.innerHTML = (startYear + 10) + '-' + (startYear + 109);

            // 设置内容。
            container.innerHTML = Calender._generateTable('x-calender-decades', 3, 4, function (yearIndex) {

                function compare(date) {
                    return date ? year - Math.floor(date.getFullYear() / 10) * 10 : NaN;
                }

                var html = '<td x-value="' + year + '" class="';

                // 超过日期范围。
                if (compare(calender.min) < 0 || compare(calender.max) > 0) { html += ' x-calender-invalid'; }

                // 当前选中的日期。
                if (compare(value) === 0) { html += ' x-calender-selected'; }

                // 今天。
                if (compare(displayValue) === 0) { html += ' x-calender-actived'; }

                html += yearIndex === 0 || yearIndex === 11 ? ' x-calender-alt">' + year + '-<br>' + (year + 9) + '&nbsp;&nbsp;</td>' : '"><a href="javascript:;">' + year + '-<br>' + (year + 9) + '&nbsp;&nbsp;</a></td>';

                year += 10;

                return html;

            });

        },

        select: function (calender, item) {
            var actived = calender.elem.querySelector('.x-calender-actived');
            actived && actived.classList.remove('x-calender-actived');
            item.classList.add('x-calender-actived');
            calender.displayValue.setFullYear(item.getAttribute('x-value'));
            calender.setView('year', 'zoomOut');
        },

        movePage: function (calender, delta) {
            calender.displayValue = calender.displayValue.addMonth(delta * 1200);
        }
    }

};

Calender.locale = {

    /**
     * 控件内部模板。
     */
    tpl: '<div class="x-calender-container">\
            <div class="x-calender-header">\
                <a href="javascript://下一页" title="下一页" class="x-calender-next x-icon">▸</a>\
                <a href="javascript://上一页" title="上一页" class="x-calender-prev x-icon">◂</a>\
                <a href="javascript://上一级" title="返回上一级" class="x-calender-title"></a>\
            </div>\
            <div class="x-calender-body"></div>\
            <div class="x-calender-time">\
                时间: \
                <input type="number" value="0" min="0" max="23" maxlength="2" />\
                :<input type="number" value="0" min="0" max="59" maxlength="2" />\
                :<input type="number" value="0" min="0" max="59" maxlength="2" />\
            </div>\
            <div class="x-calender-footer">\
                <a href="javascript://选择今天" class="x-calender-now"></a>\
            </div>\
        </div>',

    months: "一月 二月 三月 四月 五月 六月 七月 八月 九月 十月 十一月 十二月".split(' '),

    weeks: '日 一 二 三 四 五 六'.split(' '),

    month: 'yyyy年M月',

    today: '今天: yyyy年M月d日',

    date: 'yyyy/MM/dd',

    time: 'yyyy/MM/dd hh:mm:ss',

    holidays: {
        '1-1': '元旦',
        '3-8': '妇女节',
        '3-12': '植树节',
        '5-1': '劳动节',
        '5-4': '青年节',
        '6-1': '儿童节',
        '9-10': '教师节',
        '10-1': '国庆节'
    }
};
