import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getInvoice,
  sendInvoice,
  cancelInvoice,
  selectCurrentInvoice,
  selectInvoicesStatus,
  selectInvoicesError,
  clearCurrent,
} from '../../store/slices/invoicesSlice';
import { recordPayment, fetchPayments } from '../../store/slices/paymentsSlice';
import { selectUser } from '../../store/slices/authSlice';
import PaymentModal from '../../components/invoicing/PaymentModal';

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const invoice = useSelector(selectCurrentInvoice);
  const status = useSelector(selectInvoicesStatus);
  const error = useSelector(selectInvoicesError);
  const currentUser = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState('overview');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(getInvoice(id));
      dispatch(fetchPayments(id));
    }

    return () => {
      dispatch(clearCurrent());
    };
  }, [id, dispatch]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
      SENT: 'bg-blue-50 text-blue-700 border-blue-200',
      PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
      PAID: 'bg-green-50 text-green-700 border-green-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const handleSendInvoice = async () => {
    try {
      await dispatch(
        sendInvoice({
          id,
          data: {
            sendEmail: true,
            sentBy: currentUser?.id,
          },
        })
      ).unwrap();
      setShowSendModal(false);
      dispatch(getInvoice(id));
    } catch (err) {
      console.error('Failed to send invoice:', err);
    }
  };

  const handleCancelInvoice = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice?')) {
      return;
    }

    try {
      await dispatch(
        cancelInvoice({
          id,
          data: {
            cancelledBy: currentUser?.id,
            reason: 'Cancelled by user',
          },
        })
      ).unwrap();
      dispatch(getInvoice(id));
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/invoices/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download invoice PDF:', err);
      alert('Failed to download invoice PDF. Please try again.');
    }
  };

  if (status === 'loading' && !invoice) {
    return <div className="p-6">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found</div>;
  }

  const canEdit = invoice.status === 'DRAFT' || invoice.status === 'SENT';
  const canCancel = invoice.status !== 'CANCELLED' && invoice.status !== 'PAID';

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/invoices')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← Back to Invoices
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Invoice {invoice.invoiceNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintInvoice}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Download PDF
          </button>
          {canEdit && (
            <button
              onClick={() => navigate(`/invoices/${id}/edit`)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Edit
            </button>
          )}
          {invoice.status === 'DRAFT' && (
            <button
              onClick={() => setShowSendModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Send Invoice
            </button>
          )}
          {invoice.outstanding > 0 && invoice.status !== 'CANCELLED' && (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Record Payment
            </button>
          )}
          {canCancel && (
            <button
              onClick={handleCancelInvoice}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-6">
        <span
          className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeColor(
            invoice.status
          )}`}
        >
          {invoice.status.replace('_', ' ')}
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'items', 'payments', 'credit-notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Client</h3>
              <p className="text-lg font-medium text-gray-900">
                {invoice.client?.name || invoice.client?.companyName}
              </p>
              {invoice.client?.email && (
                <p className="text-sm text-gray-500">{invoice.client.email}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Project</h3>
              <p className="text-lg text-gray-900">
                {invoice.project?.name || '-'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Issue Date</h3>
              <p className="text-lg text-gray-900">
                {formatDate(invoice.issuedDate)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Due Date</h3>
              <p className="text-lg text-gray-900">
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium">
                      -{formatCurrency(invoice.discount)}
                    </span>
                  </div>
                )}
                {invoice.vatAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      VAT ({invoice.vatPercent}%):
                    </span>
                    <span className="font-medium">
                      {formatCurrency(invoice.vatAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid:</span>
                  <span className="text-green-600">
                    {formatCurrency(invoice.paidAmount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Outstanding:</span>
                  <span className="text-red-600">
                    {formatCurrency(invoice.outstanding || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.invoiceLines?.map((line, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {line.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {line.qty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {line.unit || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(line.unitRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoice.payments?.length > 0 ? (
                invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.method.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.reference || '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                    No payments recorded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'credit-notes' && (
        <div className="bg-white rounded-lg shadow p-6">
          {invoice.creditNotes?.length > 0 ? (
            <div className="space-y-4">
              {invoice.creditNotes.map((cn) => (
                <div key={cn.id} className="border rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">{cn.creditNoteNumber}</p>
                      <p className="text-sm text-gray-500">{cn.reason}</p>
                    </div>
                    <p className="font-medium text-red-600">
                      -{formatCurrency(cn.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No credit notes applied</p>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            dispatch(getInvoice(id));
            dispatch(fetchPayments(id));
          }}
        />
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Send Invoice</h2>
            <p className="text-gray-600 mb-6">
              This will mark the invoice as SENT and send it to the client's email
              address.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowSendModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;

