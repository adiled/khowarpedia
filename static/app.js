var dataset;
var khowarAlphabets = [];
var filtered = [];
var filteredIdx = [];
var filteredCurrent = -1;
var mode = "en-ur";

var $scroller;
var $list;
var $filters;

var limited = [];

var currentFilter = "1000";

var fuse;

function prune(limit) {
    var totalCount = 1000;
    var count = {};
    khowarAlphabets.forEach(function (alp) {
        count[alp] = limit || 25;
    });
    dataset.forEach(function (item) {
        if (count[item.alphabet] && totalCount) {
            limited.push(item);
            totalCount--;
            count[item.alphabet]--;
        }
    });
}

$(document).ready(function () {

    $scroller = $(".list")
    $list = $(".list tbody");
    $filters = $(".filters");

    window.localStorage.removeItem("khowar-dataset");
    dataset = window.localStorage.getItem("khowar-alldata");
    
    if (dataset) {
        dataset = JSON.parse(dataset);
        onDatasetLoad();
    }
    else {
        Promise.all([
            (new Promise((resolve) => {
                $.getJSON("dataset_rachitrali/all-latin.json", (data, status) => {
                    resolve(data);
                })
            })),
            (new Promise((resolve) => {
                $.getJSON("dataset_crowdsourced/all-latin.json", (data, status) => {
                    resolve(data);
                })
            })),
        ]).then(([ datasetOne, datasetTwo ]) => {
            window.localStorage.setItem("khowar-alldata", JSON.stringify([
                ...datasetOne,
                ...datasetTwo,
            ]));
            onDatasetLoad();
        });
    }

    function setMode() {
        var config = {
            includeScore: true,
            useExtendedSearch: true,
            keys: mode === "khowar" ? ['lexeme', 'latin', 'word'] : ['translations.english', 'translations.urdu'],
            threshold: 0.01
        }
        fuse = new Fuse(dataset, config);
    }

    function onDatasetLoad() {
        setMode();
        preRender();
        render(25);
    }

    function preRender() {
        dataset.map(function (item) { return item.alphabet })
            .forEach(function (item) {
                if (!khowarAlphabets.includes(item)) {
                    khowarAlphabets.push(item);
                }
            });
        
        khowarAlphabets.forEach(function (item) {
            var $el = $(".alphabet.template").clone();
            $el.removeClass("template");
            $el.on("click", function () {
                currentFilter = item;
                $el.addClass("active");
                var $first = $list.find(`td[data-alphabet='${item}'`)[0];
                $scroller.scrollTop($first.offsetTop + $first.clientTop - 8);
            });
            $el.text(item);
            $filters.append($el);
        });
    }

    function renderItem(item, index, $afterEl) {
        var $el = $(".item.template").clone();
        $el.removeClass("template");
        var english = item.translations[0].english ? item.translations[0].english.split(",").join(", ") : "";
        $el.attr("data-id", index);
        $($el.find("td > p")[0]).parent().attr("data-alphabet", item.alphabet);
        $($el.find("td > p")[0]).text(`${item.word}`);
        $($el.find("td > p")[1]).text(`${item.lexeme}`);
        $($el.find("td > p")[3]).text(`${english}`);
        $($el.find("td > p")[2]).text(`${item.translations[0].urdu}`);
        if (!$afterEl) {
            $list.append($el);        
        } else {
            $el.insertAfter($afterEl);
            $el = $(`.item[data-id=${index}]`);
        }
        return $el;
    }

    function render(limit) {
        var selected;
        if (limit) {
            prune(limit);
            selected = limited;
            // dataset.splice(limit, dataset.length - limit);
        } else {
            selected = dataset;
        }
        selected.forEach(function (value, index) {
            renderItem(value, index);
        });
    }

    function searchItems(keyword) {
        $("tr.highlight").removeClass("highlight");
        if (!keyword) {
            $scroller.scrollTop(0);
            $(".count").text("");    
            return;
        };
        filteredIdx = fuse.search(keyword.trim().toLowerCase()).map(function (item) {
            return item.refIndex;
        }) || [];
        // dataset.forEach(function (item, index) {
        //     var translation = item.translations[0].english && item.translations[0].english.toLowerCase();
        //     var match = new RegExp("\\b" + keyword.trim().toLowerCase() + "\\b").test(translation);
        //     if (match) {
        //         filteredIdx.push(index);
        //     }
        // });
        console.log(filteredIdx.length);

        // filtered = $(`td p.english`).parent().filter(function (index) {
        //     return new RegExp("\\b" + keyword.trim().toLowerCase() + "\\b").test(this.textContent.toLowerCase());
        // });
        $(".count").text(filteredIdx.length);
        // filtered = $(`td:contains('${keyword}')`);
        filteredCurrent = -1;
        if (filteredIdx.length) {
            goToNextItem();         
        }
    }

    function scrollToCurrent() {
        var id = filteredIdx[filteredCurrent % filteredIdx.length];
        var selector = `.item[data-id='${id}']`;
        var $el = $(selector);
        if (!$el.length) {
            // @todo fix this target neighbor index, tricky one
            var $neighbor = $(`td[data-alphabet='${dataset[id].alphabet}']`).last().parent();
            $el = renderItem(dataset[id], id, $neighbor);
        }
        $el.addClass("highlight");
        $scroller.scrollTop($el[0].offsetTop + $el[0].clientTop - 8);
    }

    function goToNextItem() {
        filteredCurrent++;
        scrollToCurrent();
    }

    function goToPrevItem() {
        filteredCurrent--;
        scrollToCurrent();
    }

    $(".searchbar input").on("input", function (e) {
        var valueChanged = false;
        if (e.type == 'propertychange') {
            valueChanged = e.originalEvent.propertyName == 'value';
        } else {
            valueChanged = true;
        }
        if (valueChanged) {
            var value = e.target.value;
            searchItems(value);
        }
    });

    $(".searchbar input").on('keyup', function (e) {
        if (!filteredIdx.length) return;
        if (e.key === 'Enter' || e.keyCode === 13) {
            goToNextItem();
        }
    });

    $(".searchbar button").on("click", function () {
        if ($(this).hasClass("next")) {
            goToNextItem();
        } else {
            goToPrevItem();
       }
    });

    $(".searchbar [data-mode]").on("click", function (e) {
        $(".searchbar [data-mode]").removeClass("selected");
        $target = $(e.target)
        $target.addClass("selected");
        mode = $target.attr("data-mode");
        setMode();
        searchItems($(".searchbar input").val());
        $(".searchbar input").focus()
    });

});