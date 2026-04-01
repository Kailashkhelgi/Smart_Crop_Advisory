package com.smartcrop.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AppException extends RuntimeException {
    private final String code;
    private final HttpStatus httpStatus;
    private final String field;

    public AppException(String code, String message, HttpStatus httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.field = null;
    }

    public AppException(String code, String message, HttpStatus httpStatus, String field) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
        this.field = field;
    }

    // Convenience factories
    public static AppException notFound(String message) {
        return new AppException("NOT_FOUND", message, HttpStatus.NOT_FOUND);
    }

    public static AppException unauthorized(String message) {
        return new AppException("UNAUTHORIZED", message, HttpStatus.UNAUTHORIZED);
    }

    public static AppException forbidden(String message) {
        return new AppException("FORBIDDEN", message, HttpStatus.FORBIDDEN);
    }

    public static AppException conflict(String code, String message) {
        return new AppException(code, message, HttpStatus.CONFLICT);
    }

    public static AppException validation(String message, String field) {
        return new AppException("VALIDATION_ERROR", message, HttpStatus.BAD_REQUEST, field);
    }

    public static AppException serviceUnavailable(String code, String message) {
        return new AppException(code, message, HttpStatus.SERVICE_UNAVAILABLE);
    }
}
