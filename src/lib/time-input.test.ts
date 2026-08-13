import { describe, expect, it } from 'vitest'
import { parseTimeInput, timeSuggestions } from './time-input'

/*
 * El campo de hora acepta texto libre porque el input nativo obliga a moverse por
 * segmentos. Todo lo que se teclee acaba en `mxISO(fecha, hora)`, así que un parseo
 * flojo no falla: crea la junta a otra hora. De ahí que se fijen aquí las formas
 * válidas y, sobre todo, las que deben devolver null para revertir al valor previo.
 */

describe('parseTimeInput', () => {
  it('completa los minutos cuando solo se teclea la hora', () => {
    expect(parseTimeInput('9')).toBe('09:00')
    expect(parseTimeInput('09')).toBe('09:00')
    expect(parseTimeInput('14')).toBe('14:00')
  })

  it('lee los dígitos de corrido como HH:MM', () => {
    expect(parseTimeInput('930')).toBe('09:30')
    expect(parseTimeInput('0930')).toBe('09:30')
    expect(parseTimeInput('1430')).toBe('14:30')
  })

  it('acepta los separadores que se usan al escribir', () => {
    expect(parseTimeInput('9:30')).toBe('09:30')
    expect(parseTimeInput('9.30')).toBe('09:30')
    expect(parseTimeInput(' 9 30 ')).toBe('09:30')
  })

  it('convierte el meridiano a 24 horas', () => {
    expect(parseTimeInput('2pm')).toBe('14:00')
    expect(parseTimeInput('2 p.m.')).toBe('14:00')
    expect(parseTimeInput('2p')).toBe('14:00')
    expect(parseTimeInput('9AM')).toBe('09:00')
    expect(parseTimeInput('12am')).toBe('00:00')
    expect(parseTimeInput('12pm')).toBe('12:00')
    expect(parseTimeInput('130pm')).toBe('13:30')
  })

  it('rechaza lo que no es una hora del día', () => {
    expect(parseTimeInput('')).toBeNull()
    expect(parseTimeInput('   ')).toBeNull()
    expect(parseTimeInput('abc')).toBeNull()
    expect(parseTimeInput('25:00')).toBeNull()
    expect(parseTimeInput('970')).toBeNull() // minuto 70
    expect(parseTimeInput('12345')).toBeNull()
    expect(parseTimeInput('14pm')).toBeNull() // el meridiano exige reloj de 12
    expect(parseTimeInput('0pm')).toBeNull()
  })
})

describe('timeSuggestions', () => {
  it('cubre la jornada visible de extremo a extremo', () => {
    const list = timeSuggestions()
    expect(list[0]).toBe('08:00')
    expect(list.at(-1)).toBe('20:00')
    expect(new Set(list).size).toBe(list.length)
  })
})
