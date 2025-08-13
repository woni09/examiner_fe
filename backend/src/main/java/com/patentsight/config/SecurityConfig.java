package com.patentsight.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {

    // 비밀번호 암호화용 Bean
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 테스트용: 모든 요청을 허용
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable()) // 🔹 REST API라 CSRF 비활성화
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin())) // 🔹 H2 콘솔 iframe 허용
                .authorizeHttpRequests(auth -> auth
                        .anyRequest().permitAll() // 🔹 모든 요청 허용
                );

        return http.build();
    }
}
