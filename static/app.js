window.localStorage.removeItem("khowar-dataset");

var LSTORAGE_DATASET = "khowar-alldata";
var LSTORAGE_MODE = "khowarpedia-mode";
var LSTORAGE_SEARCH_THRESHOLD = "khowarpedia-search-threshold";

var dataset = localStorage.getItem("khowar-alldata");
var khowarAlphabets = [];
var filtered = [];
var filteredIdxs = [];
var filteredCurrent = -1;
var mode = localStorage.getItem(LSTORAGE_MODE) || "en-ur";
var threshold = Number(localStorage.getItem(LSTORAGE_SEARCH_THRESHOLD) || 0.01);

var $scroller;
var $list;
var $filters;
var $explorer;

var limitedIdxs = [];

var currentFilter = "1000";

var fuse;

function prune(limit) {
    var totalCount = 1000;
    var count = {};
    khowarAlphabets.forEach(function (alp) {
        count[alp] = limit || 25;
    });
    dataset.forEach(function (item, index) {
        if (count[item.alphabet] && totalCount) {
            limitedIdxs.push(index);
            totalCount--;
            count[item.alphabet]--;
        }
    });
}

$(document).ready(function () {

    $scroller = $(".list");
    $list = $(".list tbody");
    $filters = $(".filters");
    $explorer = $(".explorer input");

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
            dataset = [...datasetOne, ...datasetTwo];
            onDatasetLoad();
        });
    }

    $explorer.on("input", function(e) {
        const { checked } = e.target;
        if(checked) {
            localStorage.setItem(LSTORAGE_SEARCH_THRESHOLD, 0.3);
            threshold = 0.3;
        } else {
            localStorage.setItem(LSTORAGE_SEARCH_THRESHOLD, 0.01);
            threshold = 0.01;
        }
        configureSearch();
        searchItems($(".searchbar input").val());
    })

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

    $(".searchbar input").on('keydown', function (e) {
        if (!filteredIdxs.length) return;
        if (e.key === 'Enter' || e.keyCode === 13) {
            if(e.shiftKey) {
                if(filteredCurrent === 0) return;
                goToPrevItem(); 
            } else {
                if(filteredCurrent === filteredIdxs.length - 1) return;
                goToNextItem();
            }
        }
    });

    $(".searchbar button").on("click", function () {
        if ($(this).hasClass("next")) {
            goToNextItem();
        } else {
            goToPrevItem();
       }
    });

    $("[data-mode]").on("click", function (e) {
        $("[data-mode]").removeClass("selected");
        $target = $(e.target)
        $target.addClass("selected");
        mode = $target.attr("data-mode");
        localStorage.setItem(LSTORAGE_MODE, mode);
        configureSearch();
        searchItems($(".searchbar input").val());
        $(".searchbar input").focus()
        $(".searchbar input").attr("placeholder", mode === 'en-ur' ? "words / الفاظ" : "dar tayek")
    });

    if(threshold === 0.3) {
        $explorer.attr("checked", true);
    }

    $(`[data-mode="${mode}"]`).click();

    function onDatasetLoad() {
        $(".loading").hide();
        configureSearch();
        renderAlphabetFilters();
        render(25);
    }

    function configureSearch() {
        if(!dataset) return;
        var config = {
            includeScore: true,
            useExtendedSearch: true,
            keys: mode === "khowar" ? ['lexeme', 'latin', 'word'] : ['translations.english', 'translations.urdu'],
            threshold,
        }
        fuse = new Fuse(dataset, config);
    }

    function renderAlphabetFilters() {
        dataset.map((item) => item.alphabet)
            .forEach((item) => {
                if (!khowarAlphabets.includes(item)) {
                    khowarAlphabets.push(item);
                }
            });
        
        khowarAlphabets.forEach(function (item, index) {
            var $el = $(".alphabet.template").clone();
            $el.on("click", function () {
                currentFilter = item;
                $el.addClass("active");
                var $first = $list.find(`td[data-alphabet='${item}'`)[0];
                $first.scrollIntoView();
            });
            $el.removeClass("template");
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
        if (limit) {
            prune(limit);
            limitedIdxs.forEach(function (datasetIndex) {
                renderItem(dataset[datasetIndex], datasetIndex);
            });
        } else {
            dataset.forEach(function (value, index) {
                renderItem(value, index);
            });
        }
    }

    function searchItems(keyword) {
        $("tr.highlight").removeClass("highlight");
        if (!keyword) {
            $scroller.scrollTop(0);
            $(".current-index").text("");
            $(".count").text("");    
            return;
        };
        filteredIdxs = fuse.search(keyword.trim().toLowerCase()).map(function (item) {
            return item.refIndex;
        }) || [];
        // dataset.forEach(function (item, index) {
        //     var translation = item.translations[0].english && item.translations[0].english.toLowerCase();
        //     var match = new RegExp("\\b" + keyword.trim().toLowerCase() + "\\b").test(translation);
        //     if (match) {
        //         filteredIdx.push(index);
        //     }
        // });
        // filtered = $(`td p.english`).parent().filter(function (index) {
        //     return new RegExp("\\b" + keyword.trim().toLowerCase() + "\\b").test(this.textContent.toLowerCase());
        // });
        $(".count").text(filteredIdxs.length);
        // filtered = $(`td:contains('${keyword}')`);
        filteredCurrent = -1;
        $(".current-index").text("");
        if (filteredIdxs.length) {
            goToNextItem();         
        }
    }

    function scrollToCurrent() {
        var id = filteredIdxs[filteredCurrent];
        var selector = `.item[data-id='${id}']`;
        var $el = $(selector);
        if (!$el.length) {
            // @todo evaluate if plugging next to closest existing rendered index is better UX
            var $neighbor = $(`td[data-alphabet='${dataset[id].alphabet}']`).last().parent();
            $el = renderItem(dataset[id], id, $neighbor);
        }
        $el.addClass("highlight");
        $(".current-index").text(filteredCurrent+1);
        $el[0].scrollIntoView();
    }

    function goToNextItem() {
        filteredCurrent++;
        scrollToCurrent();
    }

    function goToPrevItem() {
        filteredCurrent--;
        scrollToCurrent();
    }
});