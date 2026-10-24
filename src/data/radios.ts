/**
 * Rádios (HT/base/veicular). A lista vem do painel de gestão (ver ../catalogo.ts);
 * a de reserva fica vazia porque ainda não há campo de rádio no formulário do R.O.
 */
export interface Radio {
  identificacao: string;
  tipo: string;
  modelo: string;
  canal: string;
}

export const RADIOS_PADRAO: Radio[] = [];
