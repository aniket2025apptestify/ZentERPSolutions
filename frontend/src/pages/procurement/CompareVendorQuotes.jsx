import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  fetchMaterialRequestById,
  selectCurrentMaterialRequest,
  selectMaterialRequestsStatus,
} from '../../store/slices/materialRequestsSlice';
import {
  fetchVendorQuotesForMR,
  selectVendorQuotes,
} from '../../store/slices/vendorQuotesSlice';

const CompareVendorQuotes = () => {
  const { mrId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const materialRequest = useSelector(selectCurrentMaterialRequest);
  const status = useSelector(selectMaterialRequestsStatus);
  const vendorQuotes = useSelector(selectVendorQuotes);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);

  useEffect(() => {
    if (mrId) {
      dispatch(fetchMaterialRequestById(mrId));
      dispatch(fetchVendorQuotesForMR(mrId));
    }
  }, [dispatch, mrId]);

  if (status === 'loading') {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!materialRequest) {
    return <div className="p-8 text-center">Material Request not found</div>;
  }

  if (vendorQuotes.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <button
            onClick={() => navigate(`/procurement/material-requests/${mrId}`)}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            ← Back to Material Request
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Compare Vendor Quotes</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No vendor quotes available for comparison</p>
        </div>
      </div>
    );
  }

  const mrItems = Array.isArray(materialRequest.items) ? materialRequest.items : [];
  
  // Build comparison matrix
  const comparisonData = mrItems.map((mrItem) => {
    const itemQuotes = vendorQuotes.map((quote) => {
      const quoteLine = Array.isArray(quote.lines) 
        ? quote.lines.find((line) => 
            line.description === mrItem.itemName || 
            line.itemId === mrItem.itemId
          )
        : null;
      
      return {
        quoteId: quote.id,
        vendorName: quote.vendor?.name || 'Unknown',
        unitRate: quoteLine?.unitRate || 0,
        leadTimeDays: quoteLine?.leadTimeDays || 0,
        lineTotal: (quoteLine?.qty || mrItem.qty) * (quoteLine?.unitRate || 0),
      };
    });

    return {
      itemName: mrItem.itemName,
      qty: mrItem.qty,
      unit: mrItem.unit,
      quotes: itemQuotes,
    };
  });

  // Find best quote (lowest total)
  const quoteTotals = vendorQuotes.map((quote) => ({
    quoteId: quote.id,
    vendorName: quote.vendor?.name || 'Unknown',
    total: quote.totalAmount || 0,
    quoteNumber: quote.quoteNumber,
  }));

  const bestQuote = quoteTotals.reduce((best, current) => 
    current.total < best.total ? current : best
  , quoteTotals[0]);

  const handleCreatePO = () => {
    if (selectedQuoteId) {
      const selectedQuote = vendorQuotes.find((q) => q.id === selectedQuoteId);
      navigate(
        `/procurement/purchase-orders/create?mrId=${mrId}&vendorQuoteId=${selectedQuoteId}&vendorId=${selectedQuote?.vendorId}`
      );
    } else {
      alert('Please select a quote to create Purchase Order');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => navigate(`/procurement/material-requests/${mrId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Material Request
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Compare Vendor Quotes</h1>
            <p className="mt-2 text-sm text-gray-600">
              Material Request: {materialRequest.requestNumber}
            </p>
          </div>
          <button
            onClick={handleCreatePO}
            disabled={!selectedQuoteId}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create PO from Selected Quote
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {vendorQuotes.map((quote) => {
          const isSelected = selectedQuoteId === quote.id;
          const isBest = bestQuote.quoteId === quote.id;
          return (
            <div
              key={quote.id}
              onClick={() => setSelectedQuoteId(quote.id)}
              className={`bg-white shadow rounded-lg p-6 cursor-pointer border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{quote.vendor?.name}</h3>
                {isBest && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Best Price
                  </span>
                )}
                {isSelected && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    Selected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-2">{quote.quoteNumber}</p>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  ${quote.totalAmount?.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  Submitted: {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Item
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                {vendorQuotes.map((quote) => (
                  <th
                    key={quote.id}
                    className={`px-6 py-3 text-center text-xs font-medium uppercase ${
                      selectedQuoteId === quote.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500'
                    }`}
                  >
                    <div>{quote.vendor?.name}</div>
                    <div className="text-xs font-normal mt-1">
                      {quote.quoteNumber}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparisonData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.qty} {item.unit}
                  </td>
                  {item.quotes.map((quoteData, quoteIndex) => {
                    const isSelected = selectedQuoteId === vendorQuotes[quoteIndex].id;
                    const isLowest = item.quotes.every(
                      (q) => quoteData.unitRate <= q.unitRate || quoteData.unitRate === 0
                    ) && quoteData.unitRate > 0;
                    
                    return (
                      <td
                        key={quoteIndex}
                        className={`px-6 py-4 text-center text-sm ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="space-y-1">
                          <div className={`font-medium ${isLowest ? 'text-green-600' : 'text-gray-900'}`}>
                            ${quoteData.unitRate.toFixed(2)}
                            {isLowest && (
                              <span className="ml-1 text-xs">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${quoteData.lineTotal.toFixed(2)}
                          </div>
                          {quoteData.leadTimeDays > 0 && (
                            <div className="text-xs text-gray-400">
                              {quoteData.leadTimeDays} days
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td colSpan="2" className="px-6 py-4 text-sm text-gray-900">
                  Total Amount
                </td>
                {vendorQuotes.map((quote, index) => {
                  const isSelected = selectedQuoteId === quote.id;
                  return (
                    <td
                      key={index}
                      className={`px-6 py-4 text-center text-sm ${
                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                      }`}
                    >
                      ${quote.totalAmount?.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompareVendorQuotes;
