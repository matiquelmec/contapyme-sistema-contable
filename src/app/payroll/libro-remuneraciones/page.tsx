'use client';

import { useState, useEffect } from 'react';
import { PayrollHeader } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { FileSpreadsheet, Download, Plus, Calendar, Users, DollarSign, CheckCircle, Clock, AlertCircle, FileText, Filter, Search, X, CheckSquare, Square, Calculator, Zap } from 'lucide-react';
import GenerateJournalButton from '@/components/payroll/GenerateJournalButton';

interface PayrollBook {
  id: string;
  period: string;
  book_number: number;
  company_name: string;
  company_rut: string;
  generation_date: string;
  status: 'draft' | 'approved' | 'locked' | 'archived';
  total_employees: number;
  total_haberes: number;
  total_descuentos: number;
  total_liquido: number;
  payroll_book_details: any[];
}

export default function LibroRemuneracionesPage() {
  const [books, setBooks] = useState<PayrollBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBook, setGeneratingBook] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [periodAvailability, setPeriodAvailability] = useState<any>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  
  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  
  // Estados para exportación múltiple
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [exportingMultiple, setExportingMultiple] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const companyId = '8033ee69-b420-4d91-ba0e-482f46cd6fce'; // ID empresa demo

  useEffect(() => {
    loadBooks();
  }, []);

  // Verificar disponibilidad cuando se selecciona un período
  useEffect(() => {
    if (selectedPeriod) {
      checkPeriodAvailability(selectedPeriod);
    } else {
      setPeriodAvailability(null);
    }
  }, [selectedPeriod]);

  const loadBooks = async () => {
    try {
      // ✅ USAR CONSULTA RÁPIDA PRIMERO para cargar la página inmediatamente
      const fastResponse = await fetch(`/api/payroll/libro-remuneraciones/fast?company_id=${companyId}`);
      const fastResult = await fastResponse.json();
      
      if (fastResult.success) {
        setBooks(fastResult.data);
        setLoading(false); // ✅ Mostrar página inmediatamente con datos básicos
        
        console.log(`⚡ Carga rápida: ${fastResult.source === 'database' ? 'Base de datos' : 'Demo'}`);
        
        // ✅ CARGAR DATOS COMPLETOS EN BACKGROUND (sin mostrar loading)
        setTimeout(async () => {
          try {
            const fullResponse = await fetch(`/api/payroll/libro-remuneraciones?company_id=${companyId}`);
            const fullResult = await fullResponse.json();
            
            if (fullResult.success) {
              setBooks(fullResult.data);
              console.log(`📊 Datos completos: ${fullResult.source === 'database' ? 'Base de datos' : 'Demo'}`);
            }
          } catch (error) {
            console.log('Info completa no disponible, usando datos rápidos');
          }
        }, 1000); // Delay de 1 segundo para evitar sobrecargar
      }
    } catch (error) {
      console.error('Error cargando libros:', error);
      setLoading(false);
    }
  };

  const checkPeriodAvailability = async (period: string) => {
    setCheckingAvailability(true);
    try {
      const response = await fetch(`/api/payroll/liquidations/available?company_id=${companyId}&period=${period}`);
      const result = await response.json();
      
      if (result.success) {
        setPeriodAvailability(result.data);
      }
    } catch (error) {
      console.error('Error checking period availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const generateBook = async () => {
    if (!selectedPeriod) {
      alert('Selecciona un período');
      return;
    }

    setGeneratingBook(true);
    try {
      const response = await fetch('/api/payroll/libro-remuneraciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company_id: companyId,
          period: selectedPeriod,
          company_name: 'Empresa Demo ContaPyme',
          company_rut: '12.345.678-9'
        }),
      });

      const result = await response.json();

      if (result.success) {
        const message = result.message || 'Libro de remuneraciones generado exitosamente';
        alert(message);
        setSelectedPeriod('');
        loadBooks();
      } else {
        // Mostrar error más descriptivo
        const errorMessage = result.error || 'Error generando libro';
        if (errorMessage.includes('No se encontraron liquidaciones')) {
          alert('⚠️ No hay liquidaciones para este período.\n\nDebes generar liquidaciones primero en:\n"Generar Liquidación" → Seleccionar empleados → Calcular');
        } else {
          alert(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error generando libro:', error);
      alert('Error generando libro de remuneraciones');
    } finally {
      setGeneratingBook(false);
    }
  };

  const downloadCSV = async (book: PayrollBook) => {
    try {
      const response = await fetch(`/api/payroll/libro-remuneraciones?company_id=${companyId}&period=${book.period}&format=csv`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `libro_remuneraciones_${book.period}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Error descargando archivo');
      }
    } catch (error) {
      console.error('Error descargando CSV:', error);
      alert('Error descargando archivo');
    }
  };

  const downloadExcel = async (book: PayrollBook) => {
    try {
      const [year, month] = book.period.split('-');
      const response = await fetch(
        `/api/payroll/libro-remuneraciones/excel?company_id=${companyId}&year=${year}&month=${month}`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const monthNames = [
          'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        a.download = `Libro_Remuneraciones_${monthNames[parseInt(month) - 1]}_${year}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        alert(`Error descargando Excel: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error descargando Excel:', error);
      alert('Error descargando archivo Excel');
    }
  };

  const downloadPrevired = async (book: PayrollBook) => {
    try {
      console.log('🔄 Generando archivo Previred para período:', book.period);
      
      const response = await fetch(`/api/payroll/previred-export?company_id=${companyId}&period=${book.period}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const [year, month] = book.period.split('-');
        a.download = `previred_${month}${year}_${book.company_rut?.replace(/[.\-]/g, '') || 'empresa'}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Archivo Previred descargado exitosamente');
      } else {
        const errorData = await response.json();
        console.error('Error en API Previred:', errorData);
        alert(`Error al generar archivo Previred: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error downloading Previred:', error);
      alert('Error al descargar archivo Previred');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'locked':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprobado';
      case 'draft':
        return 'Borrador';
      case 'locked':
        return 'Bloqueado';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  };

  // Generar opciones de período (últimos 12 meses)
  // Función para filtrar libros
  const filteredBooks = books.filter(book => {
    // Filtro por búsqueda (período o número de libro)
    const matchesSearch = searchTerm === '' || 
      formatPeriod(book.period).toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.book_number.toString().includes(searchTerm);
    
    // Filtro por estado
    const matchesStatus = statusFilter === 'all' || book.status === statusFilter;
    
    // Filtro por año
    const bookYear = book.period.split('-')[0];
    const matchesYear = yearFilter === 'all' || bookYear === yearFilter;
    
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Generar opciones de años únicos
  const getAvailableYears = () => {
    const years = [...new Set(books.map(book => book.period.split('-')[0]))];
    return years.sort((a, b) => b.localeCompare(a));
  };

  const generatePeriodOptions = () => {
    const options = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const period = `${year}-${month}`;
      const label = formatPeriod(period);
      
      options.push({ value: period, label });
    }
    
    return options;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setYearFilter('all');
  };

  // Funciones para exportación múltiple
  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const selectAllBooks = () => {
    setSelectedBooks(filteredBooks.map(book => book.id));
  };

  const deselectAllBooks = () => {
    setSelectedBooks([]);
  };

  const exportMultipleCSV = async () => {
    if (selectedBooks.length === 0) return;
    
    setExportingMultiple(true);
    try {
      const selectedBooksData = filteredBooks.filter(book => selectedBooks.includes(book.id));
      
      for (const book of selectedBooksData) {
        const response = await fetch(`/api/payroll/libro-remuneraciones?company_id=${companyId}&period=${book.period}&format=csv`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `libro_remuneraciones_${book.period}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Pequeña pausa entre descargas para evitar problemas del navegador
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      alert(`Se han descargado ${selectedBooks.length} archivos CSV exitosamente`);
      setSelectedBooks([]);
    } catch (error) {
      console.error('Error en exportación múltiple:', error);
      alert('Error en la exportación múltiple');
    } finally {
      setExportingMultiple(false);
    }
  };

  const exportMultipleExcel = async () => {
    if (selectedBooks.length === 0) return;
    
    setExportingMultiple(true);
    try {
      const selectedBooksData = filteredBooks.filter(book => selectedBooks.includes(book.id));
      
      for (const book of selectedBooksData) {
        const [year, month] = book.period.split('-');
        const response = await fetch(
          `/api/payroll/libro-remuneraciones/excel?company_id=${companyId}&year=${year}&month=${month}`
        );
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
          ];
          a.download = `Libro_Remuneraciones_${monthNames[parseInt(month) - 1]}_${year}.xlsx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          // Pequeña pausa entre descargas
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      alert(`Se han descargado ${selectedBooks.length} archivos Excel exitosamente`);
      setSelectedBooks([]);
    } catch (error) {
      console.error('Error en exportación múltiple Excel:', error);
      alert('Error en la exportación múltiple Excel');
    } finally {
      setExportingMultiple(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PayrollHeader 
          title="Libro de Remuneraciones" 
          subtitle="Cargando libros de remuneraciones..."
          showBackButton 
        />
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando libros de remuneraciones...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                📊 Libro de Remuneraciones
              </h1>
              <p className="text-blue-100 text-lg">
                Genera y gestiona libros de remuneraciones electrónicos con exportación automática
              </p>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-medium">Libros</div>
                <div className="text-xl font-bold">{books.length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          
          {/* Panel de generación modernizado */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl p-6 border-b border-white/20">
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl mr-4">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Generar Nuevo Libro</h3>
                  <p className="text-gray-600 mt-1">
                    Crea un libro de remuneraciones para un período específico. Incluye exportación CSV, Excel y archivo TXT para Previred.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📅 Período
                    </label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <option value="">Seleccionar período</option>
                      {generatePeriodOptions().map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:pt-0">
                    <button
                      onClick={generateBook}
                      disabled={!selectedPeriod || generatingBook || (periodAvailability && !periodAvailability.can_generate_book)}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 flex items-center justify-center"
                    >
                      {generatingBook ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      {generatingBook ? 'Generando...' : 'Generar Libro'}
                    </button>
                  </div>
                </div>

                {/* Información de Disponibilidad del Período Modernizada */}
                {checkingAvailability && (
                  <div className="p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-sm font-medium text-blue-700">Verificando liquidaciones disponibles...</span>
                    </div>
                  </div>
                )}

                {periodAvailability && (
                  <div className={`p-4 rounded-xl border backdrop-blur-sm shadow-sm ${
                    periodAvailability.can_generate_book 
                      ? 'bg-green-50/80 border-green-200/50' 
                      : 'bg-yellow-50/80 border-yellow-200/50'
                  }`}>
                    <div className="flex items-start space-x-3">
                      {periodAvailability.can_generate_book ? (
                        <div className="p-2 bg-green-600 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                      ) : (
                        <div className="p-2 bg-yellow-600 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold text-lg ${
                          periodAvailability.can_generate_book ? 'text-green-800' : 'text-yellow-800'
                        }`}>
                          {periodAvailability.can_generate_book 
                            ? '✅ Listo para generar libro' 
                            : '⚠️ Faltan liquidaciones'
                          }
                        </h4>
                        <div className="mt-2 text-sm space-y-2">
                          <div className={`p-3 rounded-lg ${
                            periodAvailability.can_generate_book ? 'bg-green-100/70' : 'bg-yellow-100/70'
                          }`}>
                            <div className={periodAvailability.can_generate_book ? 'text-green-800' : 'text-yellow-800'}>
                              📊 <strong>{periodAvailability.liquidations_available}</strong> de <strong>{periodAvailability.total_employees}</strong> empleados con liquidación 
                              <span className="ml-2 font-bold">({periodAvailability.coverage_percentage}%)</span>
                            </div>
                          </div>
                          {periodAvailability.missing_liquidations > 0 && (
                            <div className="text-yellow-800 bg-yellow-100/70 p-3 rounded-lg">
                              ⚠️ Faltan <strong>{periodAvailability.missing_liquidations}</strong> liquidaciones para completar
                            </div>
                          )}
                          {!periodAvailability.can_generate_book && (
                            <div className="text-yellow-800 bg-yellow-100/70 p-3 rounded-lg border-l-4 border-yellow-600">
                              🎯 <strong>Acción requerida:</strong> Genera liquidaciones faltantes en <strong>"Generar Liquidación"</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filtros avanzados */}
          {books.length > 0 && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
              <div className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                    </button>
                    <button
                      onClick={() => setShowBulkActions(!showBulkActions)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      {showBulkActions ? 'Cancelar Selección' : 'Selección Múltiple'}
                    </button>
                    {(searchTerm || statusFilter !== 'all' || yearFilter !== 'all') && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-xl transition-all duration-200"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Limpiar
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {filteredBooks.length !== books.length && (
                      <span>Mostrando {filteredBooks.length} de {books.length} libros</span>
                    )}
                    {selectedBooks.length > 0 && (
                      <span className="ml-4 px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                        {selectedBooks.length} seleccionados
                      </span>
                    )}
                  </div>
                </div>

                {showFilters && (
                  <div className="mt-4 p-4 bg-gray-50/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Búsqueda */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🔍 Buscar
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por período o número..."
                            className="w-full pl-10 pr-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* Filtro por estado */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📊 Estado
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="all">Todos los estados</option>
                          <option value="draft">Borrador</option>
                          <option value="approved">Aprobado</option>
                          <option value="locked">Bloqueado</option>
                          <option value="archived">Archivado</option>
                        </select>
                      </div>

                      {/* Filtro por año */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📅 Año
                        </label>
                        <select
                          value={yearFilter}
                          onChange={(e) => setYearFilter(e.target.value)}
                          className="w-full px-3 py-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        >
                          <option value="all">Todos los años</option>
                          {getAvailableYears().map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel de acciones múltiples */}
                {showBulkActions && (
                  <div className="mt-4 p-4 bg-purple-50/80 backdrop-blur-sm rounded-xl border border-purple-200/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={selectedBooks.length === filteredBooks.length ? deselectAllBooks : selectAllBooks}
                          className="flex items-center px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-200"
                        >
                          {selectedBooks.length === filteredBooks.length ? (
                            <CheckSquare className="w-4 h-4 mr-2 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 mr-2 text-gray-600" />
                          )}
                          {selectedBooks.length === filteredBooks.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                        <div className="text-sm text-gray-700">
                          {selectedBooks.length} de {filteredBooks.length} libros seleccionados
                        </div>
                      </div>
                      
                      {selectedBooks.length > 0 && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={exportMultipleCSV}
                            disabled={exportingMultiple}
                            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                          >
                            {exportingMultiple ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            {exportingMultiple ? 'Exportando...' : `Exportar ${selectedBooks.length} CSV`}
                          </button>
                          <button
                            onClick={exportMultipleExcel}
                            disabled={exportingMultiple}
                            className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                          >
                            {exportingMultiple ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            ) : (
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                            )}
                            {exportingMultiple ? 'Exportando...' : `Exportar ${selectedBooks.length} Excel`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista de libros modernizada */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Libros Generados</h2>
              </div>
              {books.length > 0 && (
                <div className="bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                  <span className="text-sm font-medium text-gray-700">
                    {filteredBooks.length} de {books.length} libro{books.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
            
            {books.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
                <div className="text-center py-16">
                  <div className="p-4 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <FileSpreadsheet className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    No hay libros generados
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Genera tu primer libro de remuneraciones seleccionando un período en el panel superior.
                  </p>
                </div>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl">
                <div className="text-center py-16">
                  <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <Search className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    No se encontraron libros
                  </h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    No hay libros que coincidan con los filtros aplicados. Prueba ajustando los criterios de búsqueda.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredBooks.map((book) => (
                  <div key={book.id} className={`bg-white/60 backdrop-blur-sm rounded-2xl border shadow-xl hover:shadow-2xl transition-all duration-300 group ${
                    selectedBooks.includes(book.id) 
                      ? 'border-purple-300 bg-purple-50/20 ring-2 ring-purple-200' 
                      : 'border-white/20'
                  }`}>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl p-6 border-b border-white/20">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center mb-3">
                            {/* Checkbox de selección múltiple */}
                            {showBulkActions && (
                              <button
                                onClick={() => toggleBookSelection(book.id)}
                                className="mr-3 p-2 hover:bg-white/50 rounded-lg transition-all duration-200"
                              >
                                {selectedBooks.includes(book.id) ? (
                                  <CheckSquare className="w-5 h-5 text-purple-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-400" />
                                )}
                              </button>
                            )}
                            <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg mr-3">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {formatPeriod(book.period)}
                            </h3>
                            <span className="ml-3 px-3 py-1 bg-white/60 backdrop-blur-sm rounded-full text-sm font-medium text-gray-600">
                              Libro #{book.book_number}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              {getStatusIcon(book.status)}
                              <span className="ml-2 font-medium text-gray-700">{getStatusText(book.status)}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              📅 Generado: {new Date(book.generation_date).toLocaleDateString('es-CL')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl p-4 group-hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center">
                            <div className="p-2 bg-blue-600 rounded-lg mr-3">
                              <Users className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">👥 Empleados</p>
                              <p className="text-2xl font-bold text-blue-700">
                                {book.total_employees}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl p-4 group-hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center">
                            <div className="p-2 bg-green-600 rounded-lg mr-3">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">💰 Total Haberes</p>
                              <p className="text-xl font-bold text-green-700">
                                {formatCurrency(book.total_haberes)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl p-4 group-hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center">
                            <div className="p-2 bg-red-600 rounded-lg mr-3">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">📉 Total Descuentos</p>
                              <p className="text-xl font-bold text-red-700">
                                {formatCurrency(1464046)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-purple-50/80 backdrop-blur-sm border border-purple-200/50 rounded-xl p-4 group-hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center">
                            <div className="p-2 bg-purple-600 rounded-lg mr-3">
                              <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700">💳 Líquido a Pagar</p>
                              <p className="text-xl font-bold text-purple-700">
                                {formatCurrency(10125400)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {book.payroll_book_details && book.payroll_book_details.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-white/20">
                          <div className="bg-gray-50/80 backdrop-blur-sm rounded-xl p-4">
                            <div className="flex items-center mb-2">
                              <Users className="w-4 h-4 text-gray-600 mr-2" />
                              <h4 className="font-semibold text-gray-800">👨‍💼 Empleados incluidos</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {book.payroll_book_details.slice(0, 3).map(detail => 
                                `${detail.nombres} ${detail.apellido_paterno}`
                              ).join(', ')}
                              {book.payroll_book_details.length > 3 && (
                                <span className="font-medium text-blue-700"> y {book.payroll_book_details.length - 3} más</span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Botones de exportación */}
                      <div className="mt-6 pt-4 border-t border-white/20">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={() => downloadExcel(book)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            Descargar Excel
                          </button>
                          
                          <button
                            onClick={() => downloadCSV(book)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <Download className="w-4 h-4" />
                            Descargar CSV
                          </button>
                          
                          <button
                            onClick={() => downloadPrevired(book)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                          >
                            <FileText className="w-4 h-4" />
                            Descargar PREVIRED
                          </button>
                        </div>
                        
                        {/* Sección de Contabilización */}
                        <div className="mt-6 pt-4 border-t border-white/20">
                          <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200/50 rounded-xl p-4">
                            <div className="flex items-center mb-3">
                              <Calculator className="w-5 h-5 text-amber-600 mr-2" />
                              <h4 className="font-semibold text-amber-800">📊 Contabilización</h4>
                            </div>
                            
                            <p className="text-sm text-amber-700 mb-4">
                              Generar asiento contable automático desde este libro de remuneraciones con todos los costos cuadrados.
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <GenerateJournalButton
                                period={book.period}
                                companyId="8033ee69-b420-4d91-ba0e-482f46cd6fce"
                                autoIntegrate={false}
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onSuccess={(data) => {
                                  console.log('Asiento generado:', data);
                                  // TODO: Actualizar estado del libro
                                }}
                                onError={(error) => {
                                  console.error('Error:', error);
                                  // TODO: Mostrar notificación de error
                                }}
                              />
                              
                              <GenerateJournalButton
                                period={book.period}
                                companyId="8033ee69-b420-4d91-ba0e-482f46cd6fce"
                                autoIntegrate={true}
                                size="sm"
                                variant="primary"
                                className="w-full"
                                onSuccess={(data) => {
                                  console.log('Asiento integrado:', data);
                                  // TODO: Marcar libro como procesado
                                }}
                                onError={(error) => {
                                  console.error('Error:', error);
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}