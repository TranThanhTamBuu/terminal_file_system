const express = require('express');
const router = express.Router();


// router.get('/', async (req, res) => {
//     const page = req.query.page || 1;
//     if (page < 1) page = 1;
//     var sort = req.query.sort;
//     const search = req.query.search;

//     if (search === "") {
//         return res.redirect('/');
//     }

//     const spec = await specModel.singleBySpecName(search);
//     if (spec) {
//         return res.redirect('/courses/' + spec['type_name'] + '/' + spec['spec_name']);
//     }

//     const type = await typeModel.singleByTypeName(search);
//     if (type) {
//         return res.redirect('/courses/' + type['type_name']);
//     }

//     const total = await courseModel.countSearchResult(search);

//     const page_numbers = pagination.calcPageNumbers(total, page);
//     const offset = pagination.calcOffset(page);
//     const next_page = calcNextPage(page, page_numbers);

//     var all;
//     if (sort === 'lowest price') {
//         all = await courseModel.pageSearchResultSortPrice(search, offset);
//     }
//     else if (sort === 'highest rated') {
//         all = await courseModel.pageSearchResultSortRating(search, offset);
//     } else {
//         all = await courseModel.pageSearchResultSortRelevance(search, offset);
//     }

//     var query;
//     var isSort;
//     if (!sort) {
//         query = '?search=' + search;
//         isSort = false;
//     } else {
//         query = '?search=' + search + '&sort=' + sort + '&';
//         sort = sort.replace(/(^\w{1})|(\s+\w{1})/g, letter => letter.toUpperCase());
//         isSort = true;
//     }

//     bestseller.labelBestseller(res.locals.lcBestseller, all);
//     res.render('vwCourses/all', {
//         search,
//         isSearch: true,
//         isSort,
//         sort,
//         query,
//         course: all,
//         page_numbers,
//         next_page,
//         total
//     })
// })

module.exports = router;
